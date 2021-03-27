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
exports.DemoPayload = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const util_1 = require("./util");
class DemoPayload {
    constructor(target, template, user, issue) {
        this.target = target;
        this.template = template;
        this.user = user || github.context.actor;
        if (issue) {
            this.linkedIssueId = parseInt(issue);
        }
    }
    async validate(octokit) {
        this.validation = {
            templateExists: await util_1.repositoryExists(octokit, this.template.repo),
            templateRefExists: await util_1.repositoryBranchExists(octokit, this.template.repo, this.template.ref),
            targetRepoExists: await util_1.repositoryExists(octokit, this.target),
        };
    }
    getTerraformVariables() {
        const result = {
            github_context: {
                actor: this.user,
                template_repository: { ...this.template },
                target_repository: { ...this.template },
            },
            azure_context: {},
            gcp_context: {},
            aws_context: {},
        };
        if (this.linkedIssueId) {
            result.github_context['tracking_issue'] = { id: this.linkedIssueId };
        }
        return result;
    }
    getOutputs() {
        const result = {};
        result['template_repository_full_name'] = `${this.template.repo.owner}/${this.template.repo.repo}`;
        result['template_repository_owner'] = this.template.repo.owner;
        result['template_repository_name'] = this.template.repo.repo;
        result['template_repository_ref'] = this.template.ref || '';
        result['repository_full_name'] = `${this.target.owner}/${this.target.repo}`;
        result['repository_owner'] = this.target.owner;
        result['repository_name'] = this.target.repo;
        if (this.linkedIssueId) {
            result['tracking_issue'] = this.linkedIssueId;
        }
        if (this.validation) {
            result['validation_template_repository_exists'] = this.validation.templateExists;
            result['validation_template_repository_ref_exists'] = this.validation.templateRefExists;
            result['validation_repository_exists'] = this.validation.targetRepoExists;
        }
        result['terraform_variables'] = `JSON.stringify(this.getTerraformVariables())`;
        return result;
    }
    setActionsOutputs() {
        const outputs = this.getOutputs();
        Object.keys(outputs).forEach(key => {
            core.setOutput(key, outputs[key]);
        });
    }
}
exports.DemoPayload = DemoPayload;
//# sourceMappingURL=DemoPayload.js.map