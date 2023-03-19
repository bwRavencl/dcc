import * as DcsJs from "@foxdelta2/dcsjs";
import { DataStore } from "@kilcekru/dcc-shared-rpc-types";

import { Position } from "../types";
import {
	addHeading,
	findNearest,
	getDurationEnRoute,
	getFlightGroups,
	headingToPosition,
	oppositeCoalition,
	positionFromHeading,
	random,
	randomCallSign,
} from "../utils";
import { RunningCampaignState } from "./types";

export const ammoDepotRange = 50_000;
export const barrackRange = 30_000;
export const depotRange = 70_000;
export const speed = 170;

export const getCoalitionFaction = (coalition: DcsJs.CampaignCoalition, state: RunningCampaignState) => {
	if (coalition === "blue") {
		return state.blueFaction;
	} else {
		return state.redFaction;
	}
};

const calcNumber = (
	state: RunningCampaignState,
	base: string,
	index: number,
	number: number
): { flightGroup: string; unit: { name: string; index: number; number: number } } => {
	const tmp = `${base}-${number}`;

	const fgs = [...getFlightGroups(state.blueFaction.packages), ...getFlightGroups(state.redFaction.packages)];

	const callSignFg = fgs.find((fg) => fg.name === tmp);

	if (callSignFg == null) {
		return {
			flightGroup: tmp,
			unit: {
				name: base,
				index,
				number,
			},
		};
	}

	return calcNumber(state, base, index, number + 1);
};

export const generateCallSign = (
	coalition: DcsJs.CampaignCoalition,
	state: RunningCampaignState,
	dataStore: DataStore,
	type: "aircraft" | "helicopter" | "awacs"
) => {
	const { name, index } = randomCallSign(dataStore, type);

	const number = calcNumber(state, name, index, 1);

	return {
		unitCallSign: (index: number) => {
			return coalition === "blue"
				? {
						"1": number.unit.index,
						"2": number.unit.number,
						"3": index + 1,
						name: `${number.unit.name}${number.unit.number}${index + 1}`,
				  }
				: random(100, 999);
		},
		unitName: (index: number) => `${number.flightGroup}-${index + 1}`,
		flightGroupName: number.flightGroup,
	};
};

const landingNavPosition = (engressPosition: Position, airdromePosition: Position) => {
	const heading = headingToPosition(engressPosition, airdromePosition);
	return positionFromHeading(airdromePosition, addHeading(heading, 180), 25000);
};

export const calcLandingWaypoints = (
	engressPosition: Position,
	airdromePosition: Position,
	startTime: number
): [Array<DcsJs.CampaignWaypoint>, number] => {
	const navPosition = landingNavPosition(engressPosition, airdromePosition);
	const durationNav = getDurationEnRoute(engressPosition, navPosition, speed);
	const durationLanding = getDurationEnRoute(navPosition, airdromePosition, speed);
	const endNavTime = startTime + durationNav;
	const endLandingTime = endNavTime + 1 + durationLanding;

	return [
		[
			{
				name: "Nav",
				position: navPosition,
				speed,
				time: startTime,
			},
			{
				name: "Landing",
				position: airdromePosition,
				speed,
				time: endNavTime + 1,
				onGround: true,
			},
		],
		endLandingTime,
	];
};

export const calcNearestOppositeAirdrome = (
	coalition: DcsJs.CampaignCoalition,
	state: RunningCampaignState,
	dataStore: DataStore,
	position: Position
) => {
	const oppCoalition = oppositeCoalition(coalition);
	const oppFaction = getCoalitionFaction(oppCoalition, state);
	const airdromes = oppFaction.airdromeNames.map((name) => {
		if (dataStore.airdromes == null) {
			throw "undefined airdromes";
		}
		return dataStore.airdromes?.[name];
	});

	const airdrome = findNearest(airdromes, position, (ad) => ad);

	if (airdrome == null) {
		throw "undefined airdromes";
	}

	return airdrome;
};

export const unitIdsToGroundUnit = (faction: DcsJs.CampaignFaction, ids: Array<string>) => {
	return ids.reduce((prev, id) => {
		const unit = faction.inventory.groundUnits[id];

		if (unit == null) {
			return prev;
		} else {
			return [...prev, unit];
		}
	}, [] as Array<DcsJs.CampaignUnit>);
};

export function isCampaignStructureUnitCamp(
	structure: DcsJs.CampaignStructure
): structure is DcsJs.CampaignStructureUnitCamp {
	return (structure as DcsJs.CampaignStructureUnitCamp).unitIds != null;
}
