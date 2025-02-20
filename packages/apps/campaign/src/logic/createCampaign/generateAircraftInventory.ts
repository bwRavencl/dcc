import type * as DcsJs from "@foxdelta2/dcsjs";
import * as Types from "@kilcekru/dcc-shared-types";
import { createUniqueId } from "solid-js";

import { Config } from "../../data";
import { ObjectivePlan, Scenario } from "../../data/scenarios";
import { findNearest, onboardNumber } from "../../utils";
import { getFarthestAirdromeFromPosition, getFrontlineObjective, getLoadoutForAircraftType } from "../utils";

function getFrontlineFarp(
	objectives: Array<{ name: string; position: DcsJs.Position }>,
	objectivePlans: Array<ObjectivePlan>,
	frontlineObjective: DcsJs.CampaignObjective
) {
	const farps: Array<{ name: string; position: DcsJs.Position }> = [];

	objectivePlans.forEach((plan) => {
		const farp = plan.structures.find((str) => str.structureType === "Farp");

		if (farp) {
			const objective = objectives.find((obj) => obj.name === plan.objectiveName);

			if (objective == null) {
				// eslint-disable-next-line no-console
				console.error(`getFrontlineFarp: objective ${plan.objectiveName} not found`);

				return;
			}

			farps.push({ name: farp.structureName, position: objective.position });
		}
	});

	return findNearest(farps, frontlineObjective.position, (farp) => farp.position);
}

export const generateAircraftInventory = ({
	coalition,
	faction,
	objectives,
	scenario,
	dataStore,
}: {
	coalition: DcsJs.CampaignCoalition;
	faction: DcsJs.Faction;
	objectives: Array<{ name: string; position: DcsJs.Position }>;
	scenario: Scenario;
	dataStore: Types.Campaign.DataStore;
}) => {
	const airdromes = dataStore.airdromes;
	const airdromeNames: Array<DcsJs.AirdromeName> = (
		coalition === "blue" ? scenario.blue.airdromeNames : scenario.red.airdromeNames
	) as Array<DcsJs.AirdromeName>;
	const oppAirdromeNames: Array<DcsJs.AirdromeName> = (
		coalition === "blue" ? scenario.red.airdromeNames : scenario.blue.airdromeNames
	) as Array<DcsJs.AirdromeName>;

	if (airdromes == null) {
		throw "airdromes not found";
	}

	const frontlineObjective = getFrontlineObjective(objectives, oppAirdromeNames, dataStore);

	if (frontlineObjective == null) {
		throw `generateAircraftInventory: Frontline Objective not found: ${String(oppAirdromeNames)}`;
	}
	const awacsAirdrome = getFarthestAirdromeFromPosition(frontlineObjective.position, airdromeNames, dataStore);

	if (awacsAirdrome == null) {
		throw "generateAircraftInventory: AWACS Airdrome not found";
	}

	if (faction == null) {
		throw "faction not found";
	}

	const aircrafts: Array<DcsJs.Aircraft> = [];
	const farpObjective = getFrontlineFarp(
		objectives,
		scenario[coalition === "blue" ? "blue" : "red"].objectivePlans,
		frontlineObjective
	);

	faction.aircraftTypes.AWACS?.forEach((acType) => {
		const count = Math.max(2, Config.inventory.aircraft.awacs * (faction.aircraftTypes.AWACS?.length ?? 0));
		const aircraftType = acType as DcsJs.AircraftType;

		Array.from({ length: count }, () => {
			aircrafts.push({
				aircraftType,
				homeBase: {
					name: awacsAirdrome.name,
					type: "airdrome",
				},
				state: "idle",
				id: createUniqueId(),
				availableTasks: ["AWACS"],
				alive: true,
				onboardNumber: onboardNumber(),
				loadout: getLoadoutForAircraftType(aircraftType, "default", dataStore),
			});
		});
	});

	airdromeNames.forEach((airdromeName) => {
		const airdrome = airdromes[airdromeName];

		if (airdrome == null) {
			throw "airdrome not found";
		}

		faction.aircraftTypes.CAP?.forEach((acType) => {
			const count = Math.max(2, Config.inventory.aircraft.cap * (faction.aircraftTypes.CAP?.length ?? 0));
			const aircraftType = acType as DcsJs.AircraftType;

			Array.from({ length: count }, () => {
				aircrafts.push({
					aircraftType,
					state: "idle",
					id: createUniqueId(),
					availableTasks: ["CAP"],
					alive: true,
					onboardNumber: onboardNumber(),
					homeBase: {
						name: airdrome.name,
						type: "airdrome",
					},
					loadout: getLoadoutForAircraftType(aircraftType, "default", dataStore),
				});
			});
		});

		faction.aircraftTypes.CAS?.forEach((acType) => {
			const count = Math.max(2, Config.inventory.aircraft.cas * (faction.aircraftTypes.CAS?.length ?? 0));
			const aircraft = dataStore.aircrafts?.[acType as DcsJs.AircraftType];
			const aircraftType = acType as DcsJs.AircraftType;

			Array.from({ length: count }, () => {
				aircrafts.push({
					aircraftType,
					homeBase:
						aircraft?.isHelicopter && farpObjective != null
							? {
									type: "farp",
									name: farpObjective.name,
							  }
							: {
									type: "airdrome",
									name: airdrome.name,
							  },
					state: "idle",
					id: createUniqueId(),
					availableTasks: ["CAS"],
					alive: true,
					onboardNumber: onboardNumber(),
					loadout: getLoadoutForAircraftType(aircraftType, "default", dataStore),
				});
			});
		});

		faction.aircraftTypes["Pinpoint Strike"]?.forEach((acType) => {
			const count = Math.max(
				2,
				Config.inventory.aircraft.strike * (faction.aircraftTypes["Pinpoint Strike"]?.length ?? 0)
			);
			const aircraftType = acType as DcsJs.AircraftType;

			Array.from({ length: count }, () => {
				aircrafts.push({
					aircraftType,
					homeBase: {
						name: airdrome.name,
						type: "airdrome",
					},
					state: "idle",
					id: createUniqueId(),
					availableTasks: ["Pinpoint Strike"],
					alive: true,
					onboardNumber: onboardNumber(),
					loadout: getLoadoutForAircraftType(aircraftType, "default", dataStore),
				});
			});
		});

		faction.aircraftTypes.DEAD?.forEach((acType) => {
			const count = Math.max(2, Config.inventory.aircraft.dead * (faction.aircraftTypes.DEAD?.length ?? 0));
			const aircraftType = acType as DcsJs.AircraftType;

			Array.from({ length: count }, () => {
				aircrafts.push({
					aircraftType,
					homeBase: {
						name: airdrome.name,
						type: "airdrome",
					},
					state: "idle",
					id: createUniqueId(),
					availableTasks: ["DEAD"],
					alive: true,
					onboardNumber: onboardNumber(),
					loadout: getLoadoutForAircraftType(aircraftType, "default", dataStore),
				});
			});
		});
	});

	const aircraftRecord: Record<string, DcsJs.Aircraft> = {};

	aircrafts.forEach((ac) => {
		aircraftRecord[ac.id] = ac;
	});

	return aircraftRecord;
};
