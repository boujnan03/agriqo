import type { CropId } from "../types/crop";
import type { CropDetail, CropDetailsById } from "../types/cropDetail";

/**
 * Mock crop details for the "Détails" screen, one per crop referenced by the Recommendations
 * fixture. Qualitative, illustrative values (FAO-style, need agronomic validation), NOT NASA data.
 */
export const cropDetails: CropDetailsById = {
  ble: {
    name: "Blé",
    recommended: true,
    description: "Idéal pour le climat et le type de sol de Béni Mellal.",
    waterNeed: "Faible à moyen",
    bestSeason: "Nov – Mar",
    expectedYield: "Élevé",
    whyThisChoice:
      "Un temps frais et des pluies modérées font du blé une excellente option.",
  },
  orge: {
    name: "Orge",
    recommended: false,
    description:
      "Bonne tolérance à la sécheresse, adaptée en rotation après le blé.",
    waterNeed: "Faible",
    bestSeason: "Oct – Fév",
    expectedYield: "Moyen à élevé",
    whyThisChoice:
      "Sa faible demande en eau en fait un bon choix pour préserver le sol entre deux cultures plus exigeantes.",
  },
  legumineuses: {
    name: "Légumineuses",
    recommended: false,
    description:
      "Enrichissent naturellement le sol en azote, utiles entre deux céréales.",
    waterNeed: "Moyen",
    bestSeason: "Déc – Avr",
    expectedYield: "Moyen",
    whyThisChoice:
      "Elles améliorent la santé du sol pour la culture suivante plutôt que de viser le rendement maximal.",
  },
};

/** True when `id` (e.g. a raw route param) names a known crop. */
export const isCropId = (id: string): id is CropId =>
  Object.hasOwn(cropDetails, id);

/** The crop's details, or undefined for an unknown id. */
export const findCropDetail = (id: string): CropDetail | undefined =>
  isCropId(id) ? cropDetails[id] : undefined;
