"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const node_util_1 = require("node:util");
const DemoPayload_1 = require("../DemoPayload");
const util_1 = require("../util");
async function run() {
    try {
        await exec();
    }
    catch (err) {
        core.debug(node_util_1.inspect(err));
        core.setFailed(err);
    }
}
run();
async function exec() {
    const inputs = {
        template: {
            repo: {
                owner: util_1.getRequiredInput('template_repository_owner'),
                repo: util_1.getRequiredInput('template_repository_name'),
            },
            ref: core.getInput('template_repository_ref'),
        },
        target: {
            owner: util_1.getRequiredInput('repository_owner'),
            repo: util_1.getRequiredInput('repository_name'),
        },
        user: util_1.getRequiredInput('user'),
        issue: core.getInput('issue_id'),
    };
    const payload = new DemoPayload_1.DemoPayload(inputs.target, inputs.template, inputs.user, inputs.issue);
    const octokit = util_1.getOctokit(core.getInput('github_token'));
    await payload.validate(octokit);
    payload.setActionsOutputs();
    core.startGroup('Action outputs');
    core.info(JSON.stringify(payload.getOutputs()));
    core.endGroup();
    core.startGroup('Terraform variables');
    core.info(JSON.stringify(payload.getTerraformVariables()));
    core.endGroup();
}
//# sourceMappingURL=create-demo-definition.js.map