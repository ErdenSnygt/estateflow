/** Ürün geneli sabitler. İleride tenant bazlı hale gelecek. */
export const site = {
  name: "Emlak CRM",
  shortName: "EC",
  tagline: "Gayrimenkul ekipleri için modern CRM",
} as const;

/** Faz 1'de auth yok — arayüzü doldurmak için sabit kullanıcı. */
export const currentUser = {
  name: "Erden Saygut",
  role: "Ofis Yöneticisi",
  email: "erdensnygt@gmail.com",
  initials: "ES",
  status: "online" as "online" | "away" | "offline",
};
