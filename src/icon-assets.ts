export interface IconAssetDefinition {
  src: string;
  label: string;
}

export const ICON_ASSET_DEFINITIONS: Readonly<Record<string, IconAssetDefinition>> = {
  "asset:openmoji:1F3AD": {
    src: "icon/openmoji/svg/1F3AD.svg",
    label: "Performing arts icon",
  },
  "asset:openmoji:1F3B8": {
    src: "icon/openmoji/svg/1F3B8.svg",
    label: "Guitar icon",
  },
  "asset:openmoji:1F3F0": {
    src: "icon/openmoji/svg/1F3F0.svg",
    label: "Castle icon",
  },
  "asset:openmoji:1F409": {
    src: "icon/openmoji/svg/1F409.svg",
    label: "Dragon icon",
  },
  "asset:openmoji:1F680": {
    src: "icon/openmoji/svg/1F680.svg",
    label: "Rocket icon",
  },
  "asset:openmoji:1F6E1": {
    src: "icon/openmoji/svg/1F6E1.svg",
    label: "Shield icon",
  },
  "asset:openmoji:1F916": {
    src: "icon/openmoji/svg/1F916.svg",
    label: "Robot face icon",
  },
  "asset:openmoji:1F9EA": {
    src: "icon/openmoji/svg/1F9EA.svg",
    label: "Test tube icon",
  },
  "asset:openmoji:2694": {
    src: "icon/openmoji/svg/2694.svg",
    label: "Crossed swords icon",
  },
  "asset:openmoji:1F52C": {
    src: "icon/openmoji/svg/1F52C.svg",
    label: "Microscope icon",
  },
  "asset:openmoji:1F6DD": {
    src: "icon/openmoji/svg/1F6DD.svg",
    label: "Playground slide icon",
  },
  "asset:openmoji:1F9ED": {
    src: "icon/openmoji/svg/1F9ED.svg",
    label: "Compass icon",
  },
  "asset:openmoji:1F6DE": {
    src: "icon/openmoji/svg/1F6DE.svg",
    label: "Wheel icon",
  },
  "asset:openmoji:1F6DF": {
    src: "icon/openmoji/svg/1F6DF.svg",
    label: "Ring buoy icon",
  },
  "asset:openmoji:1F9EF": {
    src: "icon/openmoji/svg/1F9EF.svg",
    label: "Fire extinguisher icon",
  },
  "asset:openmoji:1F9F1": {
    src: "icon/openmoji/svg/1F9F1.svg",
    label: "Brick icon",
  },
  "asset:openmoji:1FA83": {
    src: "icon/openmoji/svg/1FA83.svg",
    label: "Boomerang icon",
  },
  "asset:openmoji:1FA99": {
    src: "icon/openmoji/svg/1FA99.svg",
    label: "Coin icon",
  },
  "asset:openmoji:1FA9C": {
    src: "icon/openmoji/svg/1FA9C.svg",
    label: "Crutch icon",
  },
  "asset:openmoji:1FA9D": {
    src: "icon/openmoji/svg/1FA9D.svg",
    label: "Hook icon",
  },
  "asset:openmoji:1FAA0": {
    src: "icon/openmoji/svg/1FAA0.svg",
    label: "Plunger icon",
  },
  "asset:openmoji:1FAAA": {
    src: "icon/openmoji/svg/1FAAA.svg",
    label: "Ladder icon",
  },
  "asset:openmoji:1F417": {
    src: "icon/openmoji/svg/1F417.svg",
    label: "Boar icon",
  },
  "asset:openmoji:1F432": {
    src: "icon/openmoji/svg/1F432.svg",
    label: "Dragon face icon",
  },
  "asset:openmoji:1F43A": {
    src: "icon/openmoji/svg/1F43A.svg",
    label: "Wolf icon",
  },
  "asset:openmoji:1F531": {
    src: "icon/openmoji/svg/1F531.svg",
    label: "Trident icon",
  },
  "asset:openmoji:1F578-FE0F": {
    src: "icon/openmoji/svg/1F578-FE0F.svg",
    label: "Spider icon",
  },
  "asset:openmoji:1F5FA-FE0F": {
    src: "icon/openmoji/svg/1F5FA-FE0F.svg",
    label: "Map icon",
  },
  "asset:openmoji:1F6D6": {
    src: "icon/openmoji/svg/1F6D6.svg",
    label: "Hut icon",
  },
  "asset:openmoji:1F982": {
    src: "icon/openmoji/svg/1F982.svg",
    label: "Scorpion icon",
  },
  "asset:openmoji:1F985": {
    src: "icon/openmoji/svg/1F985.svg",
    label: "Eagle icon",
  },
  "asset:openmoji:1F987": {
    src: "icon/openmoji/svg/1F987.svg",
    label: "Bat icon",
  },
  "asset:openmoji:1F98F": {
    src: "icon/openmoji/svg/1F98F.svg",
    label: "Ram icon",
  },
  "asset:openmoji:1F99C": {
    src: "icon/openmoji/svg/1F99C.svg",
    label: "Llama icon",
  },
  "asset:openmoji:1F9B4": {
    src: "icon/openmoji/svg/1F9B4.svg",
    label: "Bone icon",
  },
  "asset:openmoji:1FAA4": {
    src: "icon/openmoji/svg/1FAA4.svg",
    label: "Mouse trap icon",
  },
  "asset:openmoji:1FAA8": {
    src: "icon/openmoji/svg/1FAA8.svg",
    label: "Rock icon",
  },
  "asset:openmoji:1FAB6": {
    src: "icon/openmoji/svg/1FAB6.svg",
    label: "Feather icon",
  },
  "asset:openmoji:26B0-FE0F": {
    src: "icon/openmoji/svg/26B0-FE0F.svg",
    label: "Coffin icon",
  },
};

const OPENMOJI_ASSET_PREFIX = "asset:openmoji:";

export const getIconAssetByToken = (iconToken: string): IconAssetDefinition | null => {
  const manualEntry = ICON_ASSET_DEFINITIONS[iconToken];

  if (manualEntry !== undefined) {
    return manualEntry;
  }

  if (iconToken.startsWith(OPENMOJI_ASSET_PREFIX)) {
    const code = iconToken.slice(OPENMOJI_ASSET_PREFIX.length);

    return {
      src: `icon/openmoji/svg/${code}.svg`,
      label: `OpenMoji ${code} icon`,
    };
  }

  return null;
};

export const isIconAssetToken = (iconToken: string): boolean => {
  return getIconAssetByToken(iconToken) !== null;
};
