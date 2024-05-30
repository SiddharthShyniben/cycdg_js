import { graph, graphGetEnabledNodesCount } from "./graph.js";
import { clamp } from "./util.js";

import allInitalRules from "./grammar/initial-rules.js";
import {
  getRandomApplicableCoordsForRule,
  isRuleApplicableForGraph,
} from "./grammar/helper.js";
import { rng } from "./rng.js";
import unbug from "unbug";
import { fmt } from "./coords.js";

const debug = unbug("applier");

export class GraphReplacementApplier {
  constructor(
    width = 4,
    height = 5,
    {
      minCycles,
      maxCycles,
      desiredFeatures,
      minFilledPercentage,
      maxFilledPercentage,
      maxTeleports,
    } = {},
  ) {
    this.width = clamp(width, 4, 25);
    this.height = clamp(height, 5, 25);

    this.graph = graph(this.width, this.height);

    this.minCycles = clamp(minCycles || 3, 1, 100);
    this.maxCycles = clamp(maxCycles || 8, 1, 100);
    this.desiredFeatures = clamp(desiredFeatures || 5, 0, 1000);
    this.minFilledPercentage = clamp(minFilledPercentage || 65, 25, 100);
    this.maxFilledPercentage = clamp(maxFilledPercentage || 85, 25, 100);
    this.maxTeleports = clamp(maxTeleports || 2, 0, 1000);

    if (this.maxCycles < this.minCycles) this.maxCycles = this.minCycles;
    if (this.maxFilledPercentage < this.minFilledPercentage)
      this.maxFilledPercentage = this.minFilledPercentage;

    this.reset();
  }

  reset() {
    this.desiredFillPercentage = rng.randInRange(
      this.minFilledPercentage,
      this.maxFilledPercentage,
    );
    this.appliedRules = [];
    this.appliedRulesCount =
      this.appliedFeaturesCount =
      this.teleportsCount =
      this.cyclesCount =
      this.enabledNodesCount =
      this.finalizeDisabledNodesCount =
        0;

    this.applyRandomInitialRule();
  }

  applyRandomInitialRule() {
    debug("Applying random inital rule");
    const rule = allInitalRules[rng.randInRange(allInitalRules.length)];
    if (isRuleApplicableForGraph(rule, this.graph)) this.applyInitialRule(rule);
    else console.error("Rule failed!", rule.name);
    this.enabledNodesCount = graphGetEnabledNodesCount(this.graph);
  }

  applyInitialRule(rule) {
    const c = getRandomApplicableCoordsForRule(rule, this.graph);

    debug(`Applying ${rule.name} at ${fmt(c)}`);
    rule.applyOnGraphAt(this.graph, c);

    const appliedFeature = rng.fromArr(rule.mandatoryFeatures);

    debug(`Applying feature ${appliedFeature.name}`);
    appliedFeature.applyFeature(this.graph);

    if (rule.addsCycle) {
      this.cyclesCount++;
      debug(`Cycle count increased to ${this.cyclesCount}`);
    }

    this.appliedRulesCount++;
    this.appliedRules.push({
      name: rule.name,
      coords: c,
      mandatoryFeature: appliedFeature.name,
    });
  }
}
