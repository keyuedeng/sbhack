"use strict";
/**
 * Feedback Module
 * Export the main analyzeSession function and types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionDuration = exports.getTimeLimit = exports.TIME_LIMITS = exports.analyzeSession = void 0;
var analyzeSession_1 = require("./analyzeSession");
Object.defineProperty(exports, "analyzeSession", { enumerable: true, get: function () { return analyzeSession_1.analyzeSession; } });
var scoringRules_1 = require("./scoringRules");
Object.defineProperty(exports, "TIME_LIMITS", { enumerable: true, get: function () { return scoringRules_1.TIME_LIMITS; } });
Object.defineProperty(exports, "getTimeLimit", { enumerable: true, get: function () { return scoringRules_1.getTimeLimit; } });
Object.defineProperty(exports, "getSessionDuration", { enumerable: true, get: function () { return scoringRules_1.getSessionDuration; } });
