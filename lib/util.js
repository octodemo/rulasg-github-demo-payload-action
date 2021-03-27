"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepository = exports.getGitHubToken = exports.getOctokit = void 0;
const rest_1 = require("@octokit/rest");
function getOctokit(token) {
    let octokitToken;
    if (!token) {
        octokitToken = getGitHubToken();
    }
    else {
        octokitToken = token;
    }
    return new rest_1.Octokit({ auth: octokitToken });
}
exports.getOctokit = getOctokit;
function getGitHubToken() {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
        throw new Error('GitHub Token was not set for environment variable "GITHUB_TOKEN"');
    }
    return token;
}
exports.getGitHubToken = getGitHubToken;
function getRepository() {
    return {
        owner: 'peter-murray',
        repo: 'github-demo-payload-action'
    };
}
exports.getRepository = getRepository;
//# sourceMappingURL=util.js.map