import type * as DcsJs from "@foxdelta2/dcsjs";

import { distanceToPosition, Minutes, oppositeCoalition, random } from "../../utils";
import { RunningCampaignState } from "../types";
import { getCoalitionFaction } from "../utils";

const destroyStructure = (structure: DcsJs.Structure, timer: number) => {
	structure.buildings = structure.buildings.map((building) => ({
		...building,
		alive: false,
		destroyedTime: timer,
	}));
};

export const strike = (coalition: DcsJs.CampaignCoalition, state: RunningCampaignState) => {
	const faction = getCoalitionFaction(coalition, state);
	const oppFaction = getCoalitionFaction(oppositeCoalition(coalition), state);

	faction.packages.forEach((pkg) => {
		pkg.flightGroups.forEach((fg) => {
			if (fg.task === "Pinpoint Strike") {
				const targetName = fg.target;

				if (targetName == null) {
					throw "strike flight group doesn't have a target";
				}

				const targetStructure = oppFaction.structures[targetName];

				if (targetStructure == null) {
					// eslint-disable-next-line no-console
					console.warn("strike", "strike flight group target is unknown", fg, targetName, oppFaction);

					return;
				}

				if (
					distanceToPosition(fg.position, targetStructure.position) < 5_000 &&
					fg.startTime + Minutes(1) < state.timer
				) {
					fg.units.forEach((unit) => {
						const aircraft = faction.inventory.aircrafts[unit.id];

						if (aircraft == null) {
							return;
						}

						if (aircraft.a2GWeaponReadyTimer == null || aircraft.a2GWeaponReadyTimer <= state.timer) {
							// Is the attack successful
							if (random(1, 100) <= 75) {
								destroyStructure(targetStructure, state.timer);
								console.log(`Strike: ${aircraft.id} destroyed structure ${targetStructure.name}`); // eslint-disable-line no-console
							} else {
								console.log(`Strike: ${aircraft.id} missed structure ${targetStructure.name}`); // eslint-disable-line no-console
							}

							aircraft.a2GWeaponReadyTimer = state.timer + Minutes(60);
						}
					});
				}
			}
		});
	});
};
