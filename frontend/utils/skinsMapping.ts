
export const SKINS_ASSETS: Record<string, any> = {
  'cotxe_basic': require('../assets/skins/cotxe_basic.png'),
  'electric_barat': require('../assets/skins/electric_barat.png'),
  'sedan_premium': require('../assets/skins/sedan_premium.png'),
  'moto_esportiva': require('../assets/skins/moto_esportiva.png'),
  'camio_blau': require('../assets/skins/camio_blau.png'),
  'esportiu_italia': require('../assets/skins/esportiu_italia.png'),
  'super_coupe': require('../assets/skins/super_coupe.png'),
  'monoplaca_pro': require('../assets/skins/monoplaca_pro.png'),
  'nau_espacial': require('../assets/skins/nau_espacial.png'),
};

export const getSkinImage = (assetName: string) => {
  return SKINS_ASSETS[assetName] || SKINS_ASSETS['cotxe_basic'];
};