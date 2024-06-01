import { graph, graphGetEnabledNodesCount, testSanity } from "./graph.js";
import { clamp } from "./util.js";

import allInitalRules from "./grammar/initial-rules.js";
import {
  countEmptyEditableNodesNearEnabledOnes,
  getRandomApplicableCoordsForRule,
  isRuleApplicableForGraph,
  tryFindAllApplicableCoordVariantsRecursively,
} from "./grammar/helper.js";
import { rng } from "./rng.js";
import unbug from "unbug";
import { fmt } from "./coords.js";
import replacementRules from "./grammar/replacement-rules.js";
import logUpdate from "log-update";

const debug = unbug("applier");

const BASE_RULE_WEIGHT = 10;

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
      this.finalizedDisabledNodesCount =
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

  applyRandomReplacementRule() {
    debug("Applying random replacement rule");
    let rule,
      coords,
      tries = 0;

    while (tries < 10000) {
      tries++;
      logUpdate(`> Try ${tries}/10000`);
      rule = this.selectRandomRuleToApply();
      if (!rule) continue;
      coords = tryFindAllApplicableCoordVariantsRecursively(rule, this.graph);

      if (coords.length) {
        this.applyReplacementRule(rule, coords);
        return false;
      }
    }

    logUpdate.clear();
    logUpdate.done();

    return true;
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

  applyReplacementRule(rule, coords) {
    const c = rng.fromArr(coords);

    debug(`Applying ${rule.name} at ${fmt(c)}`);

    const mandatoryFeature = this.selectRandomMandatoryFeatureToApply(rule);
    if (mandatoryFeature && mandatoryFeature.prepareFeature)
      mandatoryFeature.prepareFeature(this.graph, c);

    const optionalFeature = this.selectRandomOptionalFeatureToApply(rule);
    if (optionalFeature && optionalFeature.prepareFeature)
      optionalFeature.prepareFeature(this.graph, c);

    if (mandatoryFeature) debug(`mandatory feature: ${mandatoryFeature.name}`);
    if (optionalFeature) debug(`optional feature: ${optionalFeature.name}`);

    rule.applyToGraph(this.graph, c);

    if (mandatoryFeature && mandatoryFeature.applyFeature)
      mandatoryFeature.applyFeature(this.graph, c);

    if (optionalFeature && optionalFeature.applyFeature)
      optionalFeature.applyFeature(this.graph, c);

    this.updateMetadataStatsOnRuleApply(
      rule,
      mandatoryFeature,
      optionalFeature,
      c,
    );

    const { sane, problems } = testSanity(this.graph);
    if (!sane) {
      console.log();
      console.log(
        color.red(
          `Graph is not sane after ${rule.name}! ${
            problems.length > 0 ? `Problems: ${problems.join(", ")}` : ""
          }`,
        ),
      );
      console.log();
    }
  }

  selectRandomRuleToApply() {
    return rng.weightedFromArr(replacementRules, (r) => {
      const {
        metadata: {
          enablesNodes,
          enablesNodesUnkown,
          finalizesDisabledNodes,
          addsCycle,
          addsTeleport,
        },
      } = r;
      if (enablesNodes && !this.canEnableNodes(enablesNodes)) {
        return 0;
      }

      if (
        enablesNodesUnkown &&
        this.desiredFillPercentage - this.enabledNodesCount < 35
      ) {
        return 0;
      }

      if (
        finalizesDisabledNodes &&
        !this.canFinalizeEmptyNodes(finalizesDisabledNodes)
      ) {
        return 0;
      }

      if (addsCycle) {
        if (this.minCycles > this.cyclesCount) return 2 * BASE_RULE_WEIGHT;
        if (this.maxCycles <= this.cyclesCount) return 0;
      }
      if (addsTeleport && this.teleportsCount < this.maxTeleports) return 0;
      return (r.metadata.additionalWeight || 0) + BASE_RULE_WEIGHT;
    });
  }

  canEnableNodes(count) {
    const allowed =
      (this.width * this.height * this.desiredFillPercentage) / 100;
    return this.enabledNodesCount + count <= allowed;
  }

  canFinalizeEmptyNodes(count) {
    if (countEmptyEditableNodesNearEnabledOnes(this.graph) <= count)
      return false;

    const allowed =
      (this.width * this.height * (100 - this.maxFilledPercentage)) / 100;

    return this.finalizedDisabledNodesCount + count < allowed;
  }

  selectRandomMandatoryFeatureToApply(rule) {
    if (rule.mandatoryFeatures) return rng.fromArr(rule.mandatoryFeatures);
  }

  selectRandomOptionalFeatureToApply(rule) {
    if (this.shouldFeatureBeAdded() && rule.optionalFeatures) {
      return rng.weightedFromArr(
        rule.optionalFeature,
        (x) => x.additionalWeight + BASE_RULE_WEIGHT,
      );
    }
  }

  shouldFeatureBeAdded() {
    if (this.desiredFeatures <= this.appliedFeaturesCount) return false;
    const featuresPercent =
      (100 * this.appliedFeaturesCount + this.desiredFeatures / 2) /
      this.desiredFeatures;
    return rng.randInRange(120) > featuresPercent;
  }

  updateMetadataStatsOnRuleApply(rule, mandatoryFeature, optionalFeature, c) {
    const {
      metadata: {
        addsCycle,
        addsTeleport,
        enablesNodesUnkown,
        enablesNodes,
        finalizesDisabledNodes,
        unfinalizesDisabledNodes,
      },
    } = rule;

    if (addsCycle) this.cyclesCount++;
    if (addsTeleport) this.teleportsCount++;
    if (optionalFeature) this.appliedFeaturesCount++;
    if (enablesNodesUnkown)
      this.enabledNodesCount = graphGetEnabledNodesCount(this.graph);
    else this.enabledNodesCount += enablesNodes || 0;

    this.finalizedDisabledNodesCount += finalizesDisabledNodes || 0;
    this.finalizedDisabledNodesCount -= unfinalizesDisabledNodes || 0;

    this.appliedRulesCount++;
    this.appliedRules.push({
      name: rule.name,
      coords: c,
      mandatoryFeature: mandatoryFeature?.name,
      optionalFeature: optionalFeature?.name,
      metadata: rule.metadata,
    });
  }
}
