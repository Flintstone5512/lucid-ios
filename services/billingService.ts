import api from "./api";

export async function createCheckout(priceId: string) {
  const res = await api.post("/billing/create-checkout-session", {
    priceId,
  });

  return res.data;
}

export async function openCustomerPortal() {
  const res = await api.post("/billing/portal");
  return res.data;
}