import type * as DcsJs from "@foxdelta2/dcsjs";

import * as Domain from "../../domain";
import { distanceToPosition, Minutes, oppositeCoalition, random } from "../../utils";
import { RunningCampaignState } from "../types";
import { getCoalitionFaction } from "../utils";
import { destroyAircraft } from "./utils";

export const sam = (coalition: DcsJs.CampaignCoalition, state: RunningCampaignState) => {
	const faction = getCoalitionFaction(coalition, state);
	const oppCoalition = oppositeCoalition(coalition);
	const oppFaction = getCoalitionFaction(oppCoalition, state);

	Domain.Faction.getSamGroups(faction).forEach((sam) => {
		if (sam.operational && (sam.combatTimer ?? 0) <= state.timer) {
			oppFaction.packages.forEach((pkg) => {
				const fg = pkg.flightGroups.find((fg) => distanceToPosition(sam.position, fg.position) <= sam.range);

				if (fg == null) {
					return;
				}

				fg.units.forEach((unit) => {
					if (random(1, 100) <= 50) {
						destroyAircraft(oppFaction, unit.id, state.timer);
						console.log(`SAM: ${sam.id} destroyed aircraft ${unit.id}`); // eslint-disable-line no-console
					} else {
						console.log(`SAM: ${sam.id} missed aircraft ${unit.id}`); // eslint-disable-line no-console
					}
				});

				sam.combatTimer = state.timer + Minutes(3);
			});
		}
	});
};
