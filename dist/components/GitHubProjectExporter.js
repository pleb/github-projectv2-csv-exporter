"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubProjectExporter = exports.exporterPath = void 0;
require("bootstrap/dist/css/bootstrap.css");
const emoji_regex_1 = __importDefault(require("emoji-regex"));
const export_to_csv_1 = require("export-to-csv");
const react_1 = __importDefault(require("react"));
const react_bootstrap_1 = require("react-bootstrap");
const github_projectv2_api_1 = require("../api/github-projectv2-api");
const GitHubProjectExporterSettings_1 = require("./GitHubProjectExporterSettings");
const useLocalStorageState_1 = require("./useLocalStorageState");
exports.exporterPath = '/github-projectv2-csv-exporter/?path=/story/tools-github-project-exporter--exporter';
/**
 * Use this tool to export issues from a GitHub project as a CSV.
 */
const GitHubProjectExporter = (props) => {
    const [accessToken] = (0, useLocalStorageState_1.useLocalStorageState)('', GitHubProjectExporterSettings_1.EXPORTER_ACCESS_TOKEN_KEY);
    const [organization] = (0, useLocalStorageState_1.useLocalStorageState)('', GitHubProjectExporterSettings_1.EXPORTER_ORGANIZATION_KEY);
    const [includeClosedIssues] = (0, useLocalStorageState_1.useLocalStorageState)('false', GitHubProjectExporterSettings_1.EXPORTER_INCLUDE_CLOSED_ISSUES_KEY);
    const [removeStatusEmojis] = (0, useLocalStorageState_1.useLocalStorageState)('true', GitHubProjectExporterSettings_1.EXPORTER_REMOVE_STATUS_EMOJIS_KEY);
    const [removeTitleEmojis] = (0, useLocalStorageState_1.useLocalStorageState)('false', GitHubProjectExporterSettings_1.EXPORTER_REMOVE_TITLE_EMOJIS_KEY);
    const [columnFilterEnabled] = (0, useLocalStorageState_1.useLocalStorageState)('false', GitHubProjectExporterSettings_1.EXPORTER_COLUMN_FILTER_ENABLED_KEY);
    const [columnFilterText] = (0, useLocalStorageState_1.useLocalStorageState)('', GitHubProjectExporterSettings_1.EXPORTER_COLUMN_FILTER_TEXT_KEY);
    const [knownColumnsText] = (0, useLocalStorageState_1.useLocalStorageState)(GitHubProjectExporterSettings_1.EXPORTER_KNOWN_COLUMNS_DEFAULT, GitHubProjectExporterSettings_1.EXPORTER_KNOWN_COLUMNS_KEY);
    const knownColumns = (knownColumnsText !== null && knownColumnsText !== void 0 ? knownColumnsText : '').split(',').filter((c) => !!c);
    const selectedColumnNames = (columnFilterText !== null && columnFilterText !== void 0 ? columnFilterText : '').split(',').filter((c) => !!c);
    const [orgProjects, setOrgProjects] = react_1.default.useState(undefined);
    const [loadProjectsError, setLoadProjectsError] = react_1.default.useState(undefined);
    const [exportProjectItemsError, setExportProjectItemsError] = react_1.default.useState(undefined);
    const [noItemsAlertShown, setNoItemsAlertShown] = react_1.default.useState(false);
    const [loading, setLoading] = react_1.default.useState(true);
    const [exporting, setExporting] = react_1.default.useState(false);
    const [exportingProjectNumber, setExportingProjectNumber] = react_1.default.useState(-1);
    const [progressCurrent, setProgressCurrent] = react_1.default.useState(0);
    const [progressTotal, setProgressTotal] = react_1.default.useState(0);
    react_1.default.useEffect(() => {
        if (accessToken && organization && loading) {
            (0, github_projectv2_api_1.fetchOrgProjects)(organization, accessToken)
                .then((orgProjects) => {
                setOrgProjects(orgProjects);
            })
                .catch((e) => {
                console.error(e);
                setLoadProjectsError(e);
            })
                .finally(() => setLoading(false));
        }
    }, [accessToken, organization, loading]);
    const handleExportCSV = (project) => {
        var _a, _b;
        const projectNumber = (_a = project.getProjectNumber()) !== null && _a !== void 0 ? _a : -1;
        if (accessToken && organization && projectNumber >= 0) {
            setExporting(true);
            setExportingProjectNumber(projectNumber);
            setProgressCurrent(0);
            setProgressTotal(0);
            setLoadProjectsError(undefined);
            setExportProjectItemsError(undefined);
            setNoItemsAlertShown(false);
            // START smooth loading progress bar using request time estimates
            let estimatedProgressInterval = undefined;
            const progress = (loaded, total) => {
                clearInterval(estimatedProgressInterval);
                if (loaded < total) {
                    let estimatedProgressAmount = 0;
                    const chunkMaxCount = 100;
                    const remainingInChunk = Math.min(chunkMaxCount, total - loaded);
                    const avgMillisToLoadChunk = Math.round(1500 * (remainingInChunk / chunkMaxCount));
                    estimatedProgressInterval = setInterval(() => {
                        estimatedProgressAmount = estimatedProgressAmount + 1;
                        setProgressCurrent(Math.min(Math.min(loaded + estimatedProgressAmount, loaded + (chunkMaxCount - 1)), total - 1));
                    }, avgMillisToLoadChunk / (remainingInChunk - 1));
                }
                setProgressCurrent(loaded);
                setProgressTotal(total >= 0 ? total : 0);
            };
            progress(0, (_b = project.getTotalItemCount()) !== null && _b !== void 0 ? _b : 0);
            // END smooth loading progress bar
            (0, github_projectv2_api_1.fetchProjectItems)(organization, projectNumber, accessToken, progress)
                .then((projectItems) => {
                const dataRows = projectItems
                    .filter((item) => (includeClosedIssues === 'true' ? true : item.getState() !== 'CLOSED'))
                    .filter((item) => { var _a; return columnFilterEnabled !== 'true' ? true : selectedColumnNames.includes((_a = item.getStatus()) !== null && _a !== void 0 ? _a : ''); })
                    .map((item) => {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
                    const rawTitle = (_a = item.getTitle()) !== null && _a !== void 0 ? _a : '';
                    const rawStatus = (_b = item.getStatus()) !== null && _b !== void 0 ? _b : '';
                    return {
                        Title: (removeTitleEmojis === 'true' ? rawTitle.split((0, emoji_regex_1.default)()).join('') : rawTitle).trim(),
                        Number: (_c = item.getNumber()) !== null && _c !== void 0 ? _c : '',
                        Status: (removeStatusEmojis === 'true' ? rawStatus.split((0, emoji_regex_1.default)()).join('') : rawStatus).trim(),
                        Assignees: (_e = (_d = item
                            .getAssignees()) === null || _d === void 0 ? void 0 : _d.map((a) => a.name).join(', ')) !== null && _e !== void 0 ? _e : '',
                        'Assignee Usernames': (_g = (_f = item
                            .getAssignees()) === null || _f === void 0 ? void 0 : _f.map((a) => a.login).join(', ')) !== null && _g !== void 0 ? _g : '',
                        Labels: (_j = (_h = item.getLabels()) === null || _h === void 0 ? void 0 : _h.join(', ')) !== null && _j !== void 0 ? _j : '',
                        URL: (_k = item.getUrl()) !== null && _k !== void 0 ? _k : '',
                        Milestone: (_l = item.getMilestone()) !== null && _l !== void 0 ? _l : '',
                        Author: (_o = (_m = item.getAuthor()) === null || _m === void 0 ? void 0 : _m.name) !== null && _o !== void 0 ? _o : '',
                        'Author Username': (_q = (_p = item.getAuthor()) === null || _p === void 0 ? void 0 : _p.login) !== null && _q !== void 0 ? _q : '',
                        CreatedAt: (_r = item.getCreatedAt()) !== null && _r !== void 0 ? _r : '',
                        UpdatedAt: (_s = item.getUpdatedAt()) !== null && _s !== void 0 ? _s : '',
                        ClosedAt: (_t = item.getClosedAt()) !== null && _t !== void 0 ? _t : '',
                        Type: (_u = item.getType()) !== null && _u !== void 0 ? _u : '',
                        State: (_v = item.getState()) !== null && _v !== void 0 ? _v : '',
                    };
                });
                // The en-ZA locale uses YYYY/MM/DD. We then replace all / with -.
                // See: https://stackoverflow.com/questions/23593052/format-javascript-date-as-yyyy-mm-dd
                const filename = `${project.getTitle()}-${new Date().toLocaleDateString('en-ZA').split('/').join('-')}`;
                if (dataRows.length > 0) {
                    const formattedColumnNames = removeStatusEmojis === 'true'
                        ? knownColumns.map((c) => c.split((0, emoji_regex_1.default)()).join('').trim())
                        : knownColumns;
                    // Group by Status, Assignee, then sort by issue number.
                    dataRows.sort((a, b) => {
                        // Convert known statuses to characters alphabetically matching the defined Status column order.
                        // Such as: a, b, c, etc. Then prefix them with tilde '~' to group them together.
                        // That way, the statuses will sort based on the column order. All unknown columns will fall back
                        // to alphabetical sorting.
                        const aStatusPlaceholder = formattedColumnNames.includes(a.Status)
                            ? '~' + String.fromCharCode('a'.charCodeAt(0) + formattedColumnNames.indexOf(a.Status))
                            : a.Status;
                        const bStatusPlaceholder = formattedColumnNames.includes(b.Status)
                            ? '~' + String.fromCharCode('a'.charCodeAt(0) + formattedColumnNames.indexOf(b.Status))
                            : b.Status;
                        return `${aStatusPlaceholder}.${a.Assignees}.${a.Number}`.localeCompare(`${bStatusPlaceholder}.${b.Assignees}.${b.Number}`);
                    });
                    exportCsv(dataRows, filename);
                }
                else {
                    setNoItemsAlertShown(true);
                }
                setExporting(false);
            })
                .catch((e) => {
                console.error(e);
                setExportProjectItemsError(e);
                setExporting(false);
            });
        }
    };
    const projects = orgProjects ? orgProjects.getProjects() : [];
    const projectRows = projects
        .sort((a, b) => { var _a, _b; return ((_a = a.getProjectNumber()) !== null && _a !== void 0 ? _a : 0) - ((_b = b.getProjectNumber()) !== null && _b !== void 0 ? _b : 0); })
        .map((project, index) => {
        var _a;
        const currentlyExporting = exporting && project.getProjectNumber() === exportingProjectNumber;
        const loadPercentage = Math.round((progressCurrent / progressTotal) * 100) || 0;
        return (react_1.default.createElement("tr", { key: `project-${index}` },
            react_1.default.createElement("td", { valign: "middle" },
                react_1.default.createElement("a", { href: (_a = project.getUrl()) !== null && _a !== void 0 ? _a : '', target: "_blank", rel: "noopener noreferrer", className: "text-decoration-none" }, project.getTitle())),
            react_1.default.createElement("td", { valign: "middle" }, project.getProjectNumber()),
            react_1.default.createElement("td", { valign: "middle" }, project.getTotalItemCount()),
            react_1.default.createElement("td", { valign: "middle" },
                react_1.default.createElement("div", { className: "d-flex flex-column gap-2" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement(react_bootstrap_1.Button, { variant: "primary", onClick: () => handleExportCSV(project), disabled: exporting },
                            currentlyExporting && react_1.default.createElement(react_bootstrap_1.Spinner, { animation: "border", role: "status", size: "sm" }),
                            " Export CSV")),
                    currentlyExporting && (react_1.default.createElement(react_bootstrap_1.ProgressBar, { animated: true, variant: "success", now: loadPercentage, label: `${loadPercentage}%` }))))));
    });
    const exportCsv = (jsonData, filename) => {
        // https://www.npmjs.com/package/export-to-csv
        const options = {
            fieldSeparator: ',',
            quoteStrings: '"',
            decimalSeparator: '.',
            showLabels: true,
            useTextFile: false,
            filename,
            useBom: true,
            useKeysAsHeaders: true,
        };
        const csvExporter = new export_to_csv_1.ExportToCsv(options);
        csvExporter.generateCsv(jsonData);
    };
    const validSettings = accessToken && organization;
    const selectedColumnElements = selectedColumnNames.map((col, index) => (react_1.default.createElement(react_bootstrap_1.Badge, { key: `${col}-${index}`, bg: "primary" }, col)));
    return (react_1.default.createElement("div", Object.assign({}, props, { style: Object.assign({}, props.style) }),
        react_1.default.createElement(react_bootstrap_1.Container, null,
            react_1.default.createElement(react_bootstrap_1.Row, null,
                react_1.default.createElement(react_bootstrap_1.Col, null,
                    react_1.default.createElement("h3", { className: "mt-4" }, "GitHub Project Exporter"),
                    react_1.default.createElement("div", { className: "d-flex flex-column gap-3" },
                        noItemsAlertShown && (react_1.default.createElement(react_bootstrap_1.Alert, { variant: "danger", className: "mb-2" },
                            react_1.default.createElement("p", { className: "fw-bold mb-0" }, "There were no items to export."))),
                        loadProjectsError && (react_1.default.createElement(react_bootstrap_1.Alert, { variant: "danger", className: "mb-2" },
                            react_1.default.createElement("p", { className: "fw-bold" },
                                "Could not load projects for organization",
                                ' ',
                                react_1.default.createElement(react_bootstrap_1.Badge, { bg: "danger", className: "font-monospace" }, organization),
                                ". Please check your access token and organization name."),
                            react_1.default.createElement("p", { className: "mb-0 font-monospace small" }, `${loadProjectsError}`))),
                        exportProjectItemsError && (react_1.default.createElement(react_bootstrap_1.Alert, { variant: "danger", className: "mb-2" },
                            react_1.default.createElement("p", { className: "fw-bold" }, "Could not export project."),
                            react_1.default.createElement("p", { className: "mb-0 font-monospace small" }, `${exportProjectItemsError}`))),
                        !accessToken && (react_1.default.createElement(react_bootstrap_1.Alert, { variant: "danger", className: "mb-2" },
                            "Please add a GitHub access token to ",
                            react_1.default.createElement("a", { href: GitHubProjectExporterSettings_1.settingsPath }, "Exporter Settings"),
                            ".")),
                        !organization && (react_1.default.createElement(react_bootstrap_1.Alert, { variant: "danger" },
                            "Please add an organization name to ",
                            react_1.default.createElement("a", { href: GitHubProjectExporterSettings_1.settingsPath }, "Exporter Settings"),
                            ".")),
                        validSettings && loading && (react_1.default.createElement("div", { className: "d-flex justify-content-center align-items-center", style: { height: 150 } },
                            react_1.default.createElement(react_bootstrap_1.Spinner, { animation: "border", role: "status" }))),
                        validSettings && !loading && (react_1.default.createElement(react_bootstrap_1.Card, { className: "mb-2" },
                            react_1.default.createElement(react_bootstrap_1.Card.Header, null, "Projects"),
                            react_1.default.createElement(react_bootstrap_1.Card.Body, null,
                                react_1.default.createElement(react_bootstrap_1.Table, { striped: true, bordered: true, responsive: true },
                                    react_1.default.createElement("thead", null,
                                        react_1.default.createElement("tr", null,
                                            react_1.default.createElement("th", null, "Project"),
                                            react_1.default.createElement("th", null, "Number"),
                                            react_1.default.createElement("th", null, "Total Items"),
                                            react_1.default.createElement("th", null, "Actions"))),
                                    react_1.default.createElement("tbody", null,
                                        projectRows,
                                        projectRows.length === 0 && (react_1.default.createElement("tr", null,
                                            react_1.default.createElement("td", { colSpan: 4 }, "No projects found."))))),
                                react_1.default.createElement("div", { className: "d-flex justify-content-end" },
                                    react_1.default.createElement(react_bootstrap_1.Button, { variant: "primary", onClick: () => setLoading(true) }, "Refresh"))))),
                        validSettings && (react_1.default.createElement(react_bootstrap_1.Card, { className: "mb-2" },
                            react_1.default.createElement(react_bootstrap_1.Card.Header, null, "Settings"),
                            react_1.default.createElement(react_bootstrap_1.Card.Body, null,
                                react_1.default.createElement(react_bootstrap_1.Table, { striped: true, bordered: true, responsive: true },
                                    react_1.default.createElement("thead", null,
                                        react_1.default.createElement("tr", null,
                                            react_1.default.createElement("th", null, "Setting"),
                                            react_1.default.createElement("th", null, "Value"))),
                                    react_1.default.createElement("tbody", null,
                                        react_1.default.createElement("tr", null,
                                            react_1.default.createElement("td", null, "Organization"),
                                            react_1.default.createElement("td", null,
                                                react_1.default.createElement("code", null, organization))),
                                        react_1.default.createElement("tr", null,
                                            react_1.default.createElement("td", null, "Include closed issues"),
                                            react_1.default.createElement("td", null,
                                                react_1.default.createElement(react_bootstrap_1.Badge, { bg: includeClosedIssues === 'true' ? 'primary' : 'secondary', style: { fontVariant: 'small-caps' } }, includeClosedIssues === 'true' ? 'yes' : 'no'))),
                                        react_1.default.createElement("tr", null,
                                            react_1.default.createElement("td", null, "Remove Status emojis"),
                                            react_1.default.createElement("td", null,
                                                react_1.default.createElement(react_bootstrap_1.Badge, { bg: removeStatusEmojis === 'true' ? 'primary' : 'secondary', style: { fontVariant: 'small-caps' } }, removeStatusEmojis === 'true' ? 'yes' : 'no'))),
                                        react_1.default.createElement("tr", null,
                                            react_1.default.createElement("td", null, "Remove Title emojis"),
                                            react_1.default.createElement("td", null,
                                                react_1.default.createElement(react_bootstrap_1.Badge, { bg: removeTitleEmojis === 'true' ? 'primary' : 'secondary', style: { fontVariant: 'small-caps' } }, removeTitleEmojis === 'true' ? 'yes' : 'no'))),
                                        react_1.default.createElement("tr", null,
                                            react_1.default.createElement("td", null, "Columns included"),
                                            react_1.default.createElement("td", null, columnFilterEnabled === 'true' ? (react_1.default.createElement("div", { className: "d-flex flex-wrap gap-1" }, selectedColumnElements)) : (react_1.default.createElement(react_bootstrap_1.Badge, { bg: "primary" }, "Include all columns")))))),
                                react_1.default.createElement("div", { className: "d-flex justify-content-end" },
                                    react_1.default.createElement("a", { href: GitHubProjectExporterSettings_1.settingsPath },
                                        react_1.default.createElement(react_bootstrap_1.Button, { variant: "primary" }, "Change Settings"))))))))))));
};
exports.GitHubProjectExporter = GitHubProjectExporter;