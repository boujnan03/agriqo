"""Field Shift - Streamlit UI. Run: streamlit run app.py"""
from __future__ import annotations

import folium
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from streamlit_folium import st_folium

from src import explain
from src.features import HEAT_DAY_C, compute_features
from src.power_client import DEFAULT_END, DEFAULT_LAT, DEFAULT_LON, DEFAULT_START, get_power_data
from src.scoring import TOO_CLOSE_POINTS, load_crops, score_all

LANG = "fr"
T = explain.TEXTS[LANG]["ui"]
# Categorical slots in fixed order (validated reference palette): water, soil, climate.
COLORS = {"water": "#2a78d6", "soil": "#eb6834", "climate": "#1baf7a"}
MONTHS = T["months"]

st.set_page_config(page_title="Field Shift - Tadla", page_icon="🌾", layout="wide")


@st.cache_data(show_spinner=False)
def load(lat: float, lon: float, offline: bool = False):
    pdata = get_power_data(lat, lon, DEFAULT_START, DEFAULT_END, offline=offline)
    return pdata, compute_features(pdata.df)


def bar_layout(fig: go.Figure, title: str, ytitle: str, height: int = 320) -> go.Figure:
    fig.update_layout(title=title, height=height, margin=dict(l=10, r=10, t=50, b=10),
                      yaxis_title=ytitle, bargap=0.25, hovermode="x unified",
                      legend=dict(orientation="h", y=1.12, x=0))
    fig.update_yaxes(showgrid=True, gridwidth=1, zeroline=False)
    fig.update_xaxes(showgrid=False)
    return fig


# ---------------- state + sidebar ----------------
if "lat" not in st.session_state:
    st.session_state.lat, st.session_state.lon = DEFAULT_LAT, DEFAULT_LON

with st.sidebar:
    st.header(T["priorities"])
    w_water = st.slider(T["w_water"], 0, 10, 5)
    w_soil = st.slider(T["w_soil"], 0, 10, 5)
    w_climate = st.slider(T["w_climate"], 0, 10, 5)
    st.divider()
    offline = st.toggle(T["offline_toggle"], value=False, help=T["offline_help"])
    st.caption(T["point"])
    st.write(f"**{st.session_state.lat:.2f}, {st.session_state.lon:.2f}**")
    if st.button(T["reset"]):
        st.session_state.lat, st.session_state.lon = DEFAULT_LAT, DEFAULT_LON
        st.rerun()

st.title(T["title"])
st.caption(T["subtitle"])

with st.spinner(T["loading"]):
    pdata, feats = load(st.session_state.lat, st.session_state.lon, offline)
s = feats.summary
scores = score_all(s, w_water, w_soil, w_climate)
crops = load_crops()

if pdata.source == "fallback":
    st.warning("⚠️ " + T["offline"] + " " + pdata.note)

tab_map, tab_env, tab_cmp, tab_exp = st.tabs(T["tabs"])

# ---------------- Tab 1: map ----------------
with tab_map:
    c1, c2 = st.columns([3, 2])
    with c1:
        m = folium.Map(location=[st.session_state.lat, st.session_state.lon], zoom_start=9,
                       tiles="OpenStreetMap")
        folium.Marker([st.session_state.lat, st.session_state.lon],
                      tooltip=T["selected_point"]).add_to(m)
        # Approximate POWER grid cell (0.5 deg lat x 0.625 deg lon, MERRA-2 native grid)
        clat = round(st.session_state.lat / 0.5) * 0.5
        clon = round(st.session_state.lon / 0.625) * 0.625
        folium.Rectangle([[clat - 0.25, clon - 0.3125], [clat + 0.25, clon + 0.3125]],
                         color="#2a78d6", weight=2, fill=True, fill_opacity=0.08,
                         tooltip=T["grid_cell"]).add_to(m)
        out = st_folium(m, height=480, use_container_width=True, key="map",
                        returned_objects=["last_clicked"])
        click = (out or {}).get("last_clicked")
        if click:
            lat, lon = round(click["lat"], 2), round(click["lng"], 2)
            if (lat, lon) != (round(st.session_state.lat, 2), round(st.session_state.lon, 2)):
                st.session_state.lat, st.session_state.lon = lat, lon
                st.rerun()
    with c2:
        st.subheader(T["click_hint"])
        src_label = T["source_labels"][pdata.source]
        st.metric(T["data_source"], src_label)
        st.write(f"{T['period']}: **{s['first_date']} → {s['last_date']}**")
        if pdata.elevation_m is not None:
            st.write(f"{T['elevation']}: **{pdata.elevation_m:.0f} m**")
        st.write(f"{T['missing']}: **{s['missing_share']:.1%}**")
        best = scores["ordered"][0] if scores["ordered"] else None
        if best:
            st.success(f"{T['best_now']}: **{best.id} — {best.name}** ({best.total:.1f}/100)")
            if scores["top_too_close"]:
                st.info(T["too_close"].format(pts=TOO_CLOSE_POINTS))

# ---------------- Tab 2: environmental insights ----------------
with tab_env:
    k = st.columns(5)
    k[0].metric(T["k_season_rain"], f"{s['season_rain_mm']:.0f} mm")
    k[1].metric(T["k_cv"], f"{s['season_rain_cv']:.0%}")
    k[2].metric(T["k_heat"], f"{s['heat_days_year']:.0f} j/an",
                help=T["k_heat_help"].format(t=HEAT_DAY_C, n=s["heat_days_season"]))
    k[3].metric(T["k_dry"], f"{s['dry_spell_season']:.0f} j")
    k[4].metric(T["k_soil"], f"{s['gwetroot_season']:.2f}", help=T["k_soil_help"])

    seas = feats.seasons
    if not seas.empty:
        c1, c2 = st.columns(2)
        with c1:
            fig = go.Figure(go.Bar(x=seas.index.astype(str), y=seas["rain_mm"],
                                   marker_color=COLORS["water"], name=T["rain"],
                                   hovertemplate="%{x}: %{y:.0f} mm<extra></extra>"))
            fig.add_hline(y=s["season_rain_mm"], line_dash="dot", line_width=1,
                          annotation_text=f"{T['mean']} {s['season_rain_mm']:.0f} mm")
            st.plotly_chart(bar_layout(fig, T["chart_season_rain"], "mm"), width="stretch")
        with c2:
            fig = go.Figure()
            fig.add_trace(go.Scatter(x=seas.index.astype(str), y=seas["gwettop"], mode="lines+markers",
                                     name="GWETTOP (surface)", line=dict(width=2, color=COLORS["water"]),
                                     marker=dict(size=8)))
            fig.add_trace(go.Scatter(x=seas.index.astype(str), y=seas["gwetroot"], mode="lines+markers",
                                     name="GWETROOT (racines)", line=dict(width=2, color=COLORS["soil"]),
                                     marker=dict(size=8)))
            fig.update_yaxes(range=[0, 1])
            st.plotly_chart(bar_layout(fig, T["chart_soil"], "0–1"), width="stretch")

    mon = feats.monthly.reindex(range(1, 13))
    c1, c2 = st.columns(2)
    with c1:
        fig = go.Figure(go.Bar(x=MONTHS, y=mon["rain_mm"], marker_color=COLORS["water"], name=T["rain"],
                               hovertemplate="%{x}: %{y:.0f} mm<extra></extra>"))
        st.plotly_chart(bar_layout(fig, T["chart_month_rain"], "mm"), width="stretch")
    with c2:
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=MONTHS, y=mon["t_max"], mode="lines+markers", name="T max",
                                 line=dict(width=2, color=COLORS["soil"]), marker=dict(size=8)))
        fig.add_trace(go.Scatter(x=MONTHS, y=mon["t_mean"], mode="lines+markers", name="T moy.",
                                 line=dict(width=2, color=COLORS["water"]), marker=dict(size=8)))
        st.plotly_chart(bar_layout(fig, T["chart_month_temp"], "°C"), width="stretch")

    with st.expander(T["table_view"]):
        st.dataframe(seas.round(2), width="stretch")
    st.caption(T["nasa_caption"])

# ---------------- Tab 3: rotation comparison ----------------
with tab_cmp:
    w = scores["weights"]
    st.write(T["weights_now"].format(w=w["water"], s=w["soil"], c=w["climate"]))
    if scores["top_too_close"]:
        st.info(T["too_close"].format(pts=TOO_CLOSE_POINTS))

    res = scores["results"]
    rows = [{"Rotation": f"{r.id} — {r.name}",
             T["sub_water"]: r.water.value, T["sub_soil"]: r.soil.value,
             T["sub_climate"]: r.climate.value, "Total": r.total} for r in res]
    df_scores = pd.DataFrame(rows).set_index("Rotation")

    fig = go.Figure()
    for key, label in (("water", T["sub_water"]), ("soil", T["sub_soil"]), ("climate", T["sub_climate"])):
        fig.add_trace(go.Bar(x=[r.id for r in res], y=[getattr(r, key).value for r in res],
                             name=label, marker_color=COLORS[key],
                             hovertemplate=label + " %{x}: %{y:.1f}<extra></extra>"))
    fig.update_yaxes(range=[0, 100])
    fig.update_layout(barmode="group", bargroupgap=0.08)
    c1, c2 = st.columns([3, 2])
    with c1:
        st.plotly_chart(bar_layout(fig, T["chart_subscores"], "/100", 380), width="stretch")
    with c2:
        st.subheader(T["ranking"])
        for i, r in enumerate(scores["ordered"], 1):
            st.markdown(f"**{i}. {r.id}** — {r.name}  \n{T['total']} : **{r.total:.1f} / 100**")
            st.progress(min(1.0, r.total / 100))

    st.dataframe(df_scores.style.format("{:.1f}"), width="stretch")

    for r in res:
        with st.expander(f"{T['why']} {r.id} — {r.name}"):
            wd = r.water.details
            st.markdown(f"**{T['sub_water']} : {r.water.value:.1f}**" if r.water.value is not None
                        else f"**{T['sub_water']} : {T['na']}**")
            if r.water.per_crop:
                st.dataframe(pd.DataFrame([{
                    T["crop"]: crops[p["crop"]]["name_fr"], T["need"]: p["need_mm"],
                    T["rain"]: round(p["rain_mm"]), T["deficit"]: round(p["deficit_mm"]),
                    "Score": round(p["score"], 1)} for p in r.water.per_crop]), hide_index=True)
                st.caption(T["irrig_need"].format(mm=wd["irrigation_need_mm_per_season"]))
            sd = r.soil.details
            st.markdown(f"**{T['sub_soil']} : {r.soil.value:.1f}** = " + " ".join(
                f"{v:+.0f} ({T['soil_parts'][k]})" for k, v in sd.items() if k in T["soil_parts"]))
            st.markdown(f"**{T['sub_climate']} : {r.climate.value:.1f}**" if r.climate.value is not None
                        else f"**{T['sub_climate']} : {T['na']}**")
            if r.climate.per_crop:
                st.dataframe(pd.DataFrame([{
                    T["crop"]: crops[p["crop"]]["name_fr"],
                    T["heat_pen"]: round(-p["heat_penalty"], 1),
                    T["drought_pen"]: round(-p["drought_penalty"], 1),
                    "Score": round(p["score"], 1)} for p in r.climate.per_crop]), hide_index=True)
    st.caption(T["crop_caption"])

# ---------------- Tab 4: explanation & limits ----------------
with tab_exp:
    st.subheader(T["explanation"])
    st.markdown(explain.explain(s, scores, crops, lang=LANG, seasons=feats.seasons))
    st.divider()
    st.subheader(T["limits"])
    st.markdown(explain.limitations(s, pdata, lang=LANG))
