import * as Components from "@kilcekru/dcc-lib-components";
import { rpc } from "@kilcekru/dcc-lib-rpc";
import * as Types from "@kilcekru/dcc-shared-types";
import { cnb } from "cnbuilder";
import { createSignal, For, onMount, useContext } from "solid-js";

import { CampaignContext, Clock } from "../../components";
import * as Domain from "../../domain";
import Styles from "./Open.module.less";
import { RemoveModal } from "./remove-modal";

const Campaign = (props: { synopsis: Types.Campaign.CampaignSynopsis; onRemove: () => void }) => {
	const [, { replaceCampaignState }] = useContext(CampaignContext);

	const onOpen = () => {
		rpc.campaign
			.openCampaign(props.synopsis.id)
			.then((loadedState) => {
				console.log("load", loadedState); // eslint-disable-line no-console

				if (loadedState == null) {
					return;
				}

				replaceCampaignState?.(loadedState);
			})
			.catch((e) => {
				console.error("RPC Load", e instanceof Error ? e.message : "unknown error"); // eslint-disable-line no-console
			});
	};

	return (
		<Components.Card class={Styles.faction} onPress={() => onOpen()}>
			<Components.Flag class={cnb(Styles.flag)} countryName={props.synopsis.countryName ?? "USA"} />
			<h2 class={Styles.name}>{props.synopsis.name}</h2>
			<h3 class={Styles.year}>{props.synopsis.factionName}</h3>
			<h3 class={Styles.timer}>
				<Clock value={props.synopsis.timer} withDay />
			</h3>
			<h3 class={Styles.edited}>{Domain.Format.Date.formatDateTime(props.synopsis.edited)}</h3>
			<div class={Styles["customize-button-wrapper"]}>
				<Components.Tooltip text="Remove Campaign">
					<Components.Button class={Styles["customize-button"]} unstyled onPress={() => props.onRemove()}>
						<Components.Icons.TrashFill />
					</Components.Button>
				</Components.Tooltip>
			</div>
		</Components.Card>
	);
};
export const Open = (props: { onOpenCreateCampaign: () => void }) => {
	const [removingSynopsis, setRemovingSynopsis] = createSignal<Types.Campaign.CampaignSynopsis | undefined>(undefined);
	const [campaigns, setCampaigns] = createSignal<Array<Types.Campaign.CampaignSynopsis>>([]);

	async function loadCampaigns() {
		try {
			const list = Object.values(await rpc.campaign.loadCampaignList());

			if (list.length === 0) {
				props.onOpenCreateCampaign();
			}

			setCampaigns(list);
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error(e instanceof Error ? e.message : "unknown error");
		}
	}
	onMount(async () => {
		await loadCampaigns();
	});

	async function onRemove(id: string) {
		await rpc.campaign.removeCampaign(id);

		await loadCampaigns();

		setRemovingSynopsis(undefined);
	}

	return (
		<div class={Styles["open"]}>
			<div class={Styles["content"]}>
				<div class={Styles.wrapper}>
					<h1 class={Styles.title}>Open Campaign</h1>
					<Components.ScrollContainer>
						<div class={Styles.list}>
							<For each={campaigns()} fallback={<div>No saved Campaign found</div>}>
								{(synopsis) => <Campaign synopsis={synopsis} onRemove={() => setRemovingSynopsis(synopsis)} />}
							</For>
						</div>
					</Components.ScrollContainer>

					<div class={Styles.buttons}>
						<Components.Button large onPress={() => props.onOpenCreateCampaign()}>
							Create
						</Components.Button>
					</div>
				</div>
			</div>
			<RemoveModal
				isOpen={removingSynopsis() != null}
				onCancel={() => setRemovingSynopsis(undefined)}
				onConfirm={onRemove}
				synopsis={removingSynopsis()}
			/>
		</div>
	);
};
