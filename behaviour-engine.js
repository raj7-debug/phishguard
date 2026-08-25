/**
 * PhishGuard Behaviour-Adaptive Resilience Engine (BARE) - Enterprise Edition
 * Centralized data management, micro-behavioral analytics, dynamic mutation engine,
 * and cognitive fatigue monitoring.
 */
class BehaviourEngine {
    constructor() {
        this.storageKey = 'phishguard_central_behaviour_data';
        this.initStorage();
    }

    // Initialize storage if empty with extended telemetry schemas
    initStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            const params = new URLSearchParams(window.location.search);
            const initialMode = params.get("mode") === "elderly" ? "elderly" : "student";

            const initialData = {
                userMode: initialMode, 
                simulations: [],     
                cognitiveMetrics: {  
                    totalHovers: 0,
                    avgHoverDurationMs: 0,
                    hesitationIndex: 0,
                    fatigueFactor: 1.0 // NEW: Tracks session endurance
                }
            };
            localStorage.setItem(this.storageKey, JSON.stringify(initialData));
        } else {
            const params = new URLSearchParams(window.location.search);
            const urlMode = params.get("mode");
            if (urlMode === "elderly" || urlMode === "student") {
                this.setUserMode(urlMode);
            }
        }
    }

    getData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : { userMode: 'student', simulations: [], cognitiveMetrics: {} };
    }

    saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    setUserMode(mode) {
        const data = this.getData();
        data.userMode = mode;
        this.saveData(data);
    }

    /**
     * Record a new simulation attempt with enterprise micro-behavioral parameters
     */
    recordSimulation(simulationRecord) {
        const data = this.getData();
        
        // Calculate dynamic fatigue based on response times and session length
        const sessionLength = data.simulations.length;
        const currentFatigue = Math.min(2.0, 1.0 + (sessionLength * 0.05));

        const record = {
            timestamp: new Date().toISOString(),
            userMode: simulationRecord.userMode || data.userMode,
            simulation: simulationRecord.simulation || 'unknown', 
            scenarioId: simulationRecord.scenarioId || 'general',
            trigger: simulationRecord.trigger || 'urgency', 
            correct: Boolean(simulationRecord.correct),
            action: simulationRecord.action || 'evaluated',
            responseTime: Number(simulationRecord.responseTime) || 0,
            confidence: Number(simulationRecord.confidence) || 3,
            hintUsed: Boolean(simulationRecord.hintUsed),
            difficulty: Number(simulationRecord.difficulty) || 1,
            phase: simulationRecord.phase || 'standard', 
            hoverDurationMs: Number(simulationRecord.hoverDurationMs) || 0,
            erraticMouseMoves: Number(simulationRecord.erraticMouseMoves) || 0,
            hesitationScore: Number(simulationRecord.hesitationScore) || 0,
            fatigueIndex: Number(currentFatigue.toFixed(2))
        };

        data.simulations.push(record);
        
        // Update global cognitive aggregate metrics
        data.cognitiveMetrics.totalHovers += (record.hoverDurationMs > 0 ? 1 : 0);
        data.cognitiveMetrics.fatigueFactor = record.fatigueIndex;
        
        this.saveData(data);
        this.evaluateDynamicMutation(record.trigger);

        return record;
    }

    /**
     * Dynamic Threat Mutation & Adaptive Escalation Logic
     */
    evaluateDynamicMutation(triggerName) {
        const data = this.getData();
        const triggerSims = data.simulations.filter(s => s.trigger === triggerName);
        
        if (triggerSims.length < 2) return;

        const recentAttempts = triggerSims.slice(-2);
        const consecutiveFailures = recentAttempts.every(s => !s.correct);

        if (consecutiveFailures) {
            sessionStorage.setItem('phishguard_mutation_trigger', JSON.stringify({
                activeMutation: true,
                targetTrigger: triggerName,
                actionDirective: 'ELEVATE_INTERVENTION_WARNING',
                recommendedDifficulty: Math.min(3, (recentAttempts[1].difficulty || 1) + 1),
                message: `Dynamic Threat Mutation activated: Vulnerability pattern detected in [${triggerName}]. Escalating countermeasures.`
            }));
        }
    }

    getPendingMutation() {
        const payload = sessionStorage.getItem('phishguard_mutation_trigger');
        return payload ? JSON.parse(payload) : null;
    }

    getTriggerProfile() {
        const data = this.getData();
        const triggers = {};

        data.simulations.forEach(sim => {
            const t = sim.trigger;
            if (!triggers[t]) {
                triggers[t] = { total: 0, failures: 0, totalResponseTime: 0, totalHesitation: 0 };
            }
            triggers[t].total += 1;
            if (!sim.correct) {
                triggers[t].failures += 1;
            }
            triggers[t].totalResponseTime += sim.responseTime;
            triggers[t].totalHesitation += (sim.hesitationScore || 0);
        });

        const profile = {};
        for (const [t, stats] of Object.entries(triggers)) {
            profile[t] = {
                total: stats.total,
                failures: stats.failures,
                failureRate: stats.total > 0 ? Math.round((stats.failures / stats.total) * 100) : 0,
                avgResponseTime: stats.total > 0 ? Math.round(stats.totalResponseTime / stats.total) : 0,
                avgHesitationScore: stats.total > 0 ? Math.round(stats.totalHesitation / stats.total) : 0
            };
        }
        return profile;
    }

    getWeakestTrigger() {
        const profile = this.getTriggerProfile();
        let weakest = null;
        let highestFailureRate = -1;

        for (const [trigger, stats] of Object.entries(profile)) {
            if (stats.failureRate > highestFailureRate && stats.total > 0) {
                highestFailureRate = stats.failureRate;
                weakest = trigger;
            }
        }
        return weakest || 'urgency'; 
    }

    /**
     * ADVANCED METRIC: Confidence & Recency-Weighted Resilience Score (0-100)
     * Rewards recent successes higher than older ones and factors in user confidence.
     */
    getResilienceScore() {
        const data = this.getData();
        if (data.simulations.length === 0) return 50; 

        let weightedScoreSum = 0;
        let weightSum = 0;

        data.simulations.forEach((sim, index) => {
            // Apply exponential recency weight (more recent simulations matter more)
            const recencyWeight = Math.pow(1.05, index);
            const confidenceMultiplier = (sim.confidence || 3) / 3; // normalized confidence
            
            let baseVal = sim.correct ? 100 : 0;
            // Penalize high confidence mistakes harsher than uncertain mistakes
            if (!sim.correct && sim.confidence >= 4) {
                baseVal = -10; 
            }

            weightedScoreSum += (baseVal * recencyWeight * confidenceMultiplier);
            weightSum += (100 * recencyWeight * confidenceMultiplier);
        });

        if (weightSum === 0) return 50;
        const calculated = Math.round((weightedScoreSum / weightSum) * 100);
        return Math.max(0, Math.min(100, calculated));
    }

    getAdaptiveImprovement(triggerName) {
        const data = this.getData();
        const triggerSims = data.simulations.filter(s => s.trigger === triggerName);

        const diagnosticSims = triggerSims.filter(s => s.phase === 'diagnostic' || s.phase === 'standard');
        const retestSims = triggerSims.filter(s => s.phase === 'retest' || s.phase === 'targeted');

        const calcAccuracy = (simArray) => {
            if (simArray.length === 0) return null;
            let correct = simArray.filter(s => s.correct).length;
            return Math.round((correct / simArray.length) * 100);
        };

        const beforeScore = calcAccuracy(diagnosticSims);
        const afterScore = calcAccuracy(retestSims);

        return {
            trigger: triggerName,
            before: beforeScore,
            after: afterScore,
            change: (beforeScore !== null && afterScore !== null) ? (afterScore - beforeScore) : 0
        };
    }
}

// Expose globally
window.PhishGuardEngine = new BehaviourEngine();

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    let mode = params.get("mode");
  
    if (!mode && window.PhishGuardEngine) {
      const engineData = window.PhishGuardEngine.getData();
      mode = engineData.userMode || "student";
    } else if (!mode) {
      mode = "student";
    }
  
    if (params.get("mode") !== mode) {
      window.history.replaceState({}, '', window.location.pathname + "?mode=" + mode);
    }
  
    if (window.PhishGuardEngine) {
      window.PhishGuardEngine.setUserMode(mode);
    }
  
    // Synchronize mode across all internal links
    document.querySelectorAll(".sidebar-nav a, .nav a, aside a").forEach(link => {
      const currentHref = link.getAttribute("href");
      if (currentHref && !currentHref.startsWith("#") && !currentHref.startsWith("javascript")) {
        const cleanBase = currentHref.split("?")[0];
        link.href = cleanBase + "?mode=" + mode;
      }
    });
});