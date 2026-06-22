import { apiFetch } from "@/lib/api/client";
import { getCinemasConfig } from "@/lib/cinemas-config";
import { FelixChat } from "./felix-chat";
import type { ApiCinema } from "@/lib/api/types";

export default async function FelixPage() {
  const [cinemas, cinemaConfigs] = await Promise.all([
    apiFetch<ApiCinema[]>("/cinemas"),
    Promise.resolve(getCinemasConfig()),
  ]);

  const cinemaConfigMap = new Map(cinemaConfigs.map((c) => [c.id, c]));
  const dbIds = new Set(cinemas.map((c) => c.id));
  const openAirOnly = cinemaConfigs.filter((c) => c.openAir && !dbIds.has(c.id));
  const cinemaList = [
    ...cinemas.map((c) => ({ id: c.id, name: c.name, openAir: cinemaConfigMap.get(c.id)?.openAir ?? false })),
    ...openAirOnly.map((c) => ({ id: c.id, name: c.name, openAir: true })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return <FelixChat cinemas={cinemaList} />;
}
