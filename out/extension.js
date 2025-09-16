"use strict";var dt=Object.create;var q=Object.defineProperty;var gt=Object.getOwnPropertyDescriptor;var pt=Object.getOwnPropertyNames;var ut=Object.getPrototypeOf,mt=Object.prototype.hasOwnProperty;var g=(s,e)=>q(s,"name",{value:e,configurable:!0});var k=(s,e)=>()=>(s&&(e=s(s=0)),e);var z=(s,e)=>{for(var t in e)q(s,t,{get:e[t],enumerable:!0})},Re=(s,e,t,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of pt(e))!mt.call(s,r)&&r!==t&&q(s,r,{get:()=>e[r],enumerable:!(o=gt(e,r))||o.enumerable});return s};var x=(s,e,t)=>(t=s!=null?dt(ut(s)):{},Re(e||!s||!s.__esModule?q(t,"default",{value:s,enumerable:!0}):t,s)),ht=s=>Re(q({},"__esModule",{value:!0}),s);var R,re,ue,me=k(()=>{"use strict";R=x(require("vscode")),re=class{constructor(e){this._ideInfo=null;this._config={enableFallbacks:!0,strictMode:!1,logCompatibilityIssues:!0,...e}}static{g(this,"CompatibilityService")}detectIDE(){try{let e=R.env.appName?.toLowerCase()||"";return e.includes("visual studio code")?"vscode":e.includes("kiro")||process.env.KIRO_IDE==="true"||global.KIRO_IDE===!0||typeof global.kiroIDE<"u"||typeof R.kiro<"u"?"kiro":"unknown"}catch{return"unknown"}}getIDEInfo(){if(this._ideInfo)return this._ideInfo;switch(this.detectIDE()){case"vscode":this._ideInfo={type:"vscode",version:R.version,supportedFeatures:["treeView","commands","extensionUri","extensionPath"],knownLimitations:[]};break;case"kiro":this._ideInfo={type:"kiro",version:R.version,supportedFeatures:["treeView","commands"],knownLimitations:["extensionUri_may_be_undefined","retainContextWhenHidden_may_not_work","localResourceRoots_limited"]};break;default:this._ideInfo={type:"unknown",supportedFeatures:["commands"],knownLimitations:["unknown_api_compatibility"]};break}return this._config.logCompatibilityIssues&&this._logger.info("IDE detected",this._ideInfo),this._ideInfo}isFeatureSupported(e){return this.getIDEInfo().supportedFeatures.includes(e)}getSafeExtensionUri(e){try{if(e.extensionUri)return e.extensionUri;if(e.extensionPath)return R.Uri.file(e.extensionPath);let t=__dirname;return this._config.logCompatibilityIssues,R.Uri.file(t)}catch{return this._config.logCompatibilityIssues,R.Uri.file(__dirname)}}getSafeExtensionPath(e){try{if(e.extensionPath)return e.extensionPath;if(e.extensionUri)return e.extensionUri.fsPath;let t=__dirname;return this._config.logCompatibilityIssues,t}catch{return this._config.logCompatibilityIssues,__dirname}}createSafeContext(e){return new ue(e,this)}},ue=class{static{g(this,"SafeExtensionContext")}constructor(e,t){this.original=e,this.ideType=t.detectIDE(),this.subscriptions=e.subscriptions,this.extensionUri=t.getSafeExtensionUri(e),this.extensionPath=t.getSafeExtensionPath(e)}}});var Me={};z(Me,{AgentErrorType:()=>Fe,ErrorHandler:()=>Z,FileSystemErrorType:()=>De});var N,De,Fe,Z,he=k(()=>{"use strict";N=x(require("vscode"));me();De=(n=>(n.PERMISSION_DENIED="EACCES",n.FILE_NOT_FOUND="ENOENT",n.DISK_FULL="ENOSPC",n.FILE_EXISTS="EEXIST",n.INVALID_PATH="EINVAL",n.NETWORK_ERROR="ENETWORK",n.UNKNOWN="UNKNOWN",n))(De||{}),Fe=(i=>(i.VALIDATION_FAILED="VALIDATION_FAILED",i.NAME_ALREADY_EXISTS="NAME_ALREADY_EXISTS",i.INVALID_CONFIG="INVALID_CONFIG",i.TEMPLATE_ERROR="TEMPLATE_ERROR",i.FILE_SYSTEM_ERROR="FILE_SYSTEM_ERROR",i))(Fe||{}),Z=class{static{g(this,"ErrorHandler")}constructor(e){this.logger=e}handleActivationError(e,t){let o=`Extension activation failed on ${t.ideType} IDE`;this.logger.error(o,e),this.logger.logCompatibility("Activation error details",{ideType:t.ideType,errorName:e.name,errorMessage:e.message,stack:e.stack});let r="Unable to activate Agent Manager for Q CLI extension.";switch(t.ideType){case"kiro":r+=" This may be a Kiro IDE compatibility issue. Please ensure you are using the latest version.";break;case"vscode":r+=" Try restarting VS Code or reinstalling the extension.";break;default:r+=" This may be an unsupported IDE or compatibility issue.";break}N.window.showErrorMessage(r,"Show Details").then(i=>{i==="Show Details"&&this.showDetailedError(e,t)})}logCompatibilityIssue(e,t){this.logger.logCompatibility(`Compatibility issue detected: ${e}`,{ideType:t.ideType,extensionUri:t.extensionUri.toString(),extensionPath:t.extensionPath})}showDetailedError(e,t){let o=[`Error Name: ${e.name}`,`Error Message: ${e.message}`,`IDE Type: ${t.ideType}`,`Extension URI: ${t.extensionUri.toString()}`,`Extension Path: ${t.extensionPath}`,"","Stack Trace:",e.stack||"Stack trace not available."].join(`
`);N.workspace.openTextDocument({content:o,language:"plaintext"}).then(r=>{N.window.showTextDocument(r)})}async handleAgentCreationError(e,t){let o=this.categorizeError(e),r=t?`agent '${t}'`:"agent";this.logger.error(`Agent creation failed for ${r}`,e);let i="Failed to create agent";t&&(i+=` (${t})`);let a=this.getErrorSuggestions(e,"agent_creation");switch(o){case"NAME_ALREADY_EXISTS":i=`Agent '${t}' already exists. Please use a different name.`,await this.showErrorMessage(i);break;case"VALIDATION_FAILED":i+=": The entered information is not valid.",await this.showErrorMessage(i,e,a);break;case"EACCES":i+=": Permission denied to create file.",await this.showErrorMessage(i,e,["Check folder permissions","Run as administrator","Try in a different location"]);break;case"ENOSPC":i+=": Insufficient disk space.",await this.showErrorMessage(i,e,["Clean up disk space","Use a different drive"]);break;default:await this.showErrorMessage(i,e,a);break}}async handleFileSystemError(e,t,o){let r=this.categorizeError(e),i=o?` (${o})`:"";this.logger.error(`File system error during ${t}${i}`,e);let a=`File system operation failed: ${t}`,n=[];switch(r){case"EACCES":a=`Permission denied for ${t} operation${i}`,n.push("Check file/folder permissions"),n.push("Run VS Code as administrator"),o&&n.push("Check if file is being used by another program");break;case"ENOENT":a=`File or folder not found${i}`,n.push("Check if the path is correct"),n.push("Check if file was deleted or moved");break;case"ENOSPC":a=`Cannot complete ${t} operation due to insufficient disk space`,n.push("Perform disk cleanup"),n.push("Delete unnecessary files"),n.push("Use a different drive");break;case"EEXIST":a=`Cannot complete ${t} operation because file already exists${i}`,n.push("Use a different name"),n.push("Delete or move existing file");break;case"EINVAL":a=`Cannot perform ${t} operation due to invalid path${i}`,n.push("Check if path contains special characters"),n.push("Check if path is too long");break;default:a+=i,n.push("Try again later"),n.push("Restart VS Code");break}await this.showErrorMessage(a,e,n)}async handleValidationError(e,t){if(e.isValid)return;let o=t?` (${t})`:"";this.logger.warn(`Validation failed${o}`,{errors:e.errors,warnings:e.warnings});let r="The entered information is not valid";if(t&&(r+=` - ${t}`),e.errors.length===1&&e.errors[0]?r=e.errors[0]:e.errors.length>1&&(r+=`:
`+e.errors.map(i=>`\u2022 ${i}`).join(`
`)),e.warnings&&e.warnings.length>0){let i=`Please check the following:
`+e.warnings.map(a=>`\u2022 ${a}`).join(`
`);await this.showWarningMessage(i)}await this.showErrorMessage(r)}async handleFileAccessError(e,t){let o=this.categorizeError(e);this.logger.error(`File access error for ${t}`,e);let r=`Cannot access file: ${t}`,i=[];switch(o){case"ENOENT":r=`File not found: ${t}`,i.push("Check if file was deleted or moved"),i.push("Refresh agent list"),i.push("Recreate the agent");break;case"EACCES":r=`Permission denied to access file: ${t}`,i.push("Check file permissions"),i.push("Run VS Code as administrator"),i.push("Check if file is being used by another program");break;default:i.push("Check if file path is correct"),i.push("Try again later"),i.push("Restart VS Code");break}await this.showErrorMessage(r,e,i)}async showSuccessMessage(e,t){if(this.logger.info(`Success: ${e}`),t&&t.length>0)return await N.window.showInformationMessage(e,...t);await N.window.showInformationMessage(e)}async showErrorMessage(e,t,o){if(this.logger.error(`Error shown to user: ${e}`,t),o&&o.length>0)return await N.window.showErrorMessage(e,...o);await N.window.showErrorMessage(e)}async showWarningMessage(e,t){if(this.logger.warn(`Warning shown to user: ${e}`),t&&t.length>0)return await N.window.showWarningMessage(e,...t);await N.window.showWarningMessage(e)}categorizeError(e){let t=e.code,o=e.message.toLowerCase();switch(t){case"EACCES":case"EPERM":return"EACCES";case"ENOENT":return"ENOENT";case"ENOSPC":return"ENOSPC";case"EEXIST":return"EEXIST";case"EINVAL":return"EINVAL"}return o.includes("already exists")?"NAME_ALREADY_EXISTS":o.includes("invalid")&&(o.includes("name")||o.includes("validation")||o.includes("config"))?"VALIDATION_FAILED":o.includes("json")||o.includes("parse")?"INVALID_CONFIG":o.includes("template")?"TEMPLATE_ERROR":o.includes("permission")||o.includes("access")?"EACCES":o.includes("not found")||o.includes("no such file")?"ENOENT":o.includes("space")||o.includes("disk full")?"ENOSPC":"UNKNOWN"}getErrorSuggestions(e,t){let o=this.categorizeError(e),r=[];switch(o){case"EACCES":r.push("Run VS Code as administrator"),r.push("Check file/folder permissions"),r.push("Check antivirus software");break;case"ENOSPC":r.push("Perform disk cleanup"),r.push("Delete temporary files"),r.push("Use a different drive");break;case"ENOENT":r.push("Check path"),r.push("Check if file exists"),r.push("Refresh workspace");break;case"VALIDATION_FAILED":r.push("Check input format"),r.push("Check special character restrictions"),r.push("Check length restrictions");break;case"NAME_ALREADY_EXISTS":r.push("Use a different name"),r.push("Check existing agents");break;case"INVALID_CONFIG":r.push("Check JSON format"),r.push("Check required fields"),r.push("Validate schema");break;default:r.push("Try again later"),r.push("Restart VS Code"),r.push("Reinstall extension");break}return t==="agent_creation"&&(r.push("Check agent name rules"),r.push("Check .amazonq/cli-agents/ folder permissions")),r}isRecoverableError(e){let t=this.categorizeError(e);return["ENOENT","EINVAL","VALIDATION_FAILED","NAME_ALREADY_EXISTS","INVALID_CONFIG"].includes(t)}getRecoverySuggestions(e,t){let o=[];return e.message.includes("tree view")&&(o.push("Check Agent Manager for Q CLI icon in Activity Bar"),o.push("Restart IDE and try again")),e.message.includes("extension")&&(o.push("Reinstall extension"),o.push("Check VS Code/Kiro IDE updates")),t.ideType==="kiro"&&(o.push("Run in Kiro IDE compatibility mode"),o.push("Test in VS Code")),o}}});var se=k(()=>{"use strict"});var we,ce,Ve=k(()=>{"use strict";se();we="qcli.wizard.state",ce=class{constructor(e,t){this.logger=e;this.context=t;this.state=this.initializeState()}static{g(this,"WizardStateService")}initializeState(){if(this.context){let e=this.context.workspaceState.get(we);if(e&&this.isValidState(e))return this.logger.debug("Restored wizard state from workspace"),e}return this.createInitialState()}isValidState(e){return e&&typeof e.currentStep=="number"&&e.stepData&&e.stepData.basicProperties&&e.stepData.agentLocation&&e.stepData.toolsSelection&&e.stepData.resources&&e.stepData.hookConfiguration}persistState(){this.context&&this.context.workspaceState.update(we,this.state)}getState(){return{...this.state}}updateStepData(e,t){this.state.stepData[e]={...this.state.stepData[e],...t},this.persistState(),this.logger.debug("Wizard step data updated",{step:e,data:t})}setCurrentStep(e){this.canProceedToStep(e)?(this.state.currentStep=e,this.persistState(),this.logger.debug("Wizard step changed",{step:e})):this.logger.warn("Cannot proceed to step due to validation",{step:e})}setValidation(e,t){this.state.validation[e]=t,this.logger.debug("Wizard validation updated",{step:e,isValid:t.isValid})}canProceedToStep(e){if(e<=this.state.currentStep)return!0;for(let t=1;t<e;t++)if(!this.isStepCompleted(t))return!1;return!0}isStepCompleted(e){let t=this.state.validation[e];return t?t.isValid:!1}reset(){this.state=this.createInitialState(),this.persistState(),this.logger.debug("Wizard state reset")}clearState(){this.state=this.createInitialState(),this.context&&this.context.workspaceState.update(we,void 0),this.logger.debug("Wizard state cleared")}createInitialState(){return{currentStep:1,totalSteps:6,stepData:{basicProperties:{name:"",description:"",prompt:""},agentLocation:{location:"local"},toolsSelection:{standardTools:["fs_read","fs_write","execute_bash","use_aws","introspect"],experimentalTools:[]},resources:{resources:["file://AmazonQ.md","file://README.md","file://.amazonq/rules/**/*.md"]},hookConfiguration:{hooks:[],skipHooks:!1}},validation:{},isComplete:!1}}updateHookConfiguration(e){this.state.stepData.hookConfiguration={...this.state.stepData.hookConfiguration,...e},this.persistState(),this.logger.debug("Hook configuration updated",{data:e})}addHook(e){this.state.stepData.hookConfiguration.hooks.push(e),this.persistState(),this.logger.debug("Hook added",{hookId:e.id})}removeHook(e){this.state.stepData.hookConfiguration.hooks=this.state.stepData.hookConfiguration.hooks.filter(t=>t.id!==e),this.persistState(),this.logger.debug("Hook removed",{hookId:e})}updateHook(e,t){let o=this.state.stepData.hookConfiguration.hooks.findIndex(r=>r.id===e);o!==-1&&(this.state.stepData.hookConfiguration.hooks[o]={...this.state.stepData.hookConfiguration.hooks[o],...t},this.persistState(),this.logger.debug("Hook updated",{hookId:e,updates:t}))}}});var le,Oe=k(()=>{"use strict";le=class{constructor(){this.dangerousCommands=["rm","del","delete","format","mkfs","dd","fdisk","parted","shutdown","reboot","sudo","su","chmod 777","chown"];this.networkCommands=["curl","wget","ssh","scp","rsync","nc","netcat","telnet","ftp"]}static{g(this,"HookValidationService")}validateHook(e){let t={isValid:!0,errors:[],warnings:[],securityWarnings:[]};return e.name.trim()?/^[a-zA-Z0-9가-힣\-_\s]+$/.test(e.name)||(t.errors.push("Hook \uC774\uB984\uC5D0\uB294 \uD2B9\uC218\uBB38\uC790\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4"),t.isValid=!1):(t.errors.push("Hook \uC774\uB984\uC740 \uD544\uC218\uC785\uB2C8\uB2E4"),t.isValid=!1),e.command.trim()?this.validateCommand(e.command,t):(t.errors.push("\uBA85\uB839\uC5B4\uB294 \uD544\uC218\uC785\uB2C8\uB2E4"),t.isValid=!1),t}validateCommand(e,t){let o=e.toLowerCase();for(let r of this.dangerousCommands)o.includes(r)&&(t.securityWarnings.push(`\uC704\uD5D8\uD55C \uBA85\uB839\uC5B4\uAC00 \uAC10\uC9C0\uB418\uC5C8\uC2B5\uB2C8\uB2E4: ${r}`),t.warnings.push("\uC774 \uBA85\uB839\uC5B4\uB294 \uC2DC\uC2A4\uD15C\uC5D0 \uC601\uD5A5\uC744 \uC904 \uC218 \uC788\uC2B5\uB2C8\uB2E4"));for(let r of this.networkCommands)o.includes(r)&&(t.securityWarnings.push(`\uB124\uD2B8\uC6CC\uD06C \uBA85\uB839\uC5B4\uAC00 \uAC10\uC9C0\uB418\uC5C8\uC2B5\uB2C8\uB2E4: ${r}`),t.warnings.push("\uB124\uD2B8\uC6CC\uD06C \uBA85\uB839\uC5B4\uB294 \uBCF4\uC548\uC0C1 \uC8FC\uC758\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4"));(e.includes("|")||e.includes(">")||e.includes(">>"))&&t.warnings.push("\uD30C\uC774\uD504\uB098 \uB9AC\uB2E4\uC774\uB809\uC158 \uC0AC\uC6A9 \uC2DC \uCD9C\uB825 \uD06C\uAE30\uC5D0 \uC8FC\uC758\uD558\uC138\uC694")}validateHookList(e){let t={isValid:!0,errors:[],warnings:[],securityWarnings:[]},o=e.map(i=>i.name.toLowerCase());o.filter((i,a)=>o.indexOf(i)!==a).length>0&&(t.errors.push("\uC911\uBCF5\uB41C Hook \uC774\uB984\uC774 \uC788\uC2B5\uB2C8\uB2E4"),t.isValid=!1);for(let i of e){let a=this.validateHook(i);a.isValid||(t.isValid=!1,t.errors.push(...a.errors)),t.warnings.push(...a.warnings),t.securityWarnings.push(...a.securityWarnings)}return t}}});var de,He=k(()=>{"use strict";se();Oe();de=class{constructor(e){this.logger=e;this.hookValidationService=new le}static{g(this,"WizardValidationService")}setAgentConfigService(e){this.agentConfigService=e}async validateStep(e,t){let o=[],r=[];switch(e){case 1:let a=await this.validateBasicProperties(t.basicProperties);o.push(...a.errors),r.push(...a.warnings||[]);break;case 2:let n=this.validateAgentLocation(t.agentLocation);o.push(...n.errors);break;case 3:let c=this.validateToolsSelection(t.toolsSelection);o.push(...c.errors),r.push(...c.warnings||[]);break;case 4:let m=await this.validateResources(t.resources);o.push(...m.errors),r.push(...m.warnings||[]);break;case 5:let l=this.validateHookConfiguration(t.hookConfiguration);o.push(...l.errors),r.push(...l.warnings||[]);break;case 6:break}let i={isValid:o.length===0,errors:o,warnings:r.length>0?r:void 0};return this.logger.debug("Step validation completed",{step:e,result:i}),i}validateField(e,t,o){let r=[];switch(e){case 1:t==="name"&&(!o||!o.trim()?r.push("Agent name is required"):o.length<2?r.push("Agent name must be at least 2 characters"):/^[a-zA-Z0-9_-]+$/.test(o)||r.push("Agent name can only contain letters, numbers, hyphens, and underscores"));break}return{isValid:r.length===0,errors:r}}async validateBasicProperties(e){let t=[],o=[],r=this.validateField(1,"name",e.name);if(t.push(...r.errors),this.agentConfigService&&e.name.trim())try{await this.agentConfigService.isAgentNameExists(e.name.trim())&&t.push(`Agent name '${e.name}' already exists. Please choose a different name.`)}catch(i){this.logger.warn("Failed to check agent name uniqueness",i),o.push("Could not verify agent name uniqueness")}return{isValid:t.length===0,errors:t,warnings:o}}validateAgentLocation(e){let t=[];return(!e.location||!["local","global"].includes(e.location))&&t.push("Please select a valid agent location"),{isValid:t.length===0,errors:t}}validateToolsSelection(e){let t=[],o=[];return e.standardTools.length+e.experimentalTools.length===0&&o.push("No tools selected. Agent will have limited functionality."),e.experimentalTools.length>0&&o.push("Experimental tools may change or be removed in future versions."),{isValid:t.length===0,errors:t,warnings:o}}async validateResources(e){let t=[],o=[];for(let i of e.resources){if(!i.trim()){t.push("Empty resource path is not allowed");continue}i.startsWith("file://")||t.push(`Resource path must start with 'file://': ${i}`),/[<>"|?]/.test(i)&&t.push(`Resource path contains invalid characters: ${i}`)}return new Set(e.resources).size!==e.resources.length&&o.push("Duplicate resource paths detected"),{isValid:t.length===0,errors:t,warnings:o}}validateHookConfiguration(e){if(e.skipHooks)return{isValid:!0,errors:[]};if(e.hooks.length===0)return{isValid:!0,errors:[]};let t=this.hookValidationService.validateHookList(e.hooks);return{isValid:t.isValid,errors:t.errors,warnings:t.warnings}}}});var X,v,ge,Be,K=k(()=>{"use strict";X=x(require("vscode")),v={AGENT_DIRECTORY:".amazonq/cli-agents",GLOBAL_AGENT_DIRECTORY:".aws/amazonq/cli-agents",AGENT_FILE_EXTENSION:".json",MAX_AGENT_NAME_LENGTH:50,MIN_AGENT_NAME_LENGTH:1,VALID_NAME_PATTERN:/^[a-zA-Z0-9_-]+$/,RESERVED_NAMES:["default","system","config","settings"],DEFAULT_ICON:new X.ThemeIcon("robot"),CREATE_ICON:new X.ThemeIcon("add"),GLOBAL_ICON:new X.ThemeIcon("globe"),CONFLICT_ICON:new X.ThemeIcon("warning"),CONTEXT_VALUES:{AGENT_ITEM:"agentItem",CREATE_BUTTON:"createAgentButton",EMPTY_STATE:"emptyAgentState",LOCATION_SEPARATOR:"locationSeparator",CONFLICT_WARNING:"conflictWarning"},TEMPLATES:{SCHEMA_URL:"https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json",DEFAULT_DESCRIPTION:"Custom Q CLI Agent",BASIC_TOOLS:["fs_read","fs_write","execute_bash","knowledge","thinking"],ADVANCED_TOOLS:["use_aws","gh_issue","web_search","calculator","code_interpreter"],DEFAULT_RESOURCES:["file://README.md","file://.amazonq/rules/**/*.md"],COMMON_RESOURCES:["file://docs/**/*.md","file://src/**/*.ts","file://src/**/*.js","file://package.json","file://tsconfig.json"]}},ge={$schema:v.TEMPLATES.SCHEMA_URL,description:v.TEMPLATES.DEFAULT_DESCRIPTION,prompt:null,tools:[...v.TEMPLATES.BASIC_TOOLS,...v.TEMPLATES.ADVANCED_TOOLS],allowedTools:["fs_read"],resources:[...v.TEMPLATES.DEFAULT_RESOURCES],useLegacyMcpJson:!0},Be={CREATE_AGENT:"qcli-agents.createAgent",DELETE_AGENT:"qcli-agents.deleteAgent",EDIT_AGENT:"qcli-agents.editAgent",OPEN_AGENT:"qcli-agents.openAgent",SELECT_AGENT:"qcli-agents.selectAgent",REFRESH_AGENTS:"qcli-agents.refreshTree",VALIDATE_AGENT:"qcli-agents.validateAgent"}});var ye={};z(ye,{AgentLocation:()=>pe,AgentLocationService:()=>Y});var V,O,Ue,be,pe,Y,J=k(()=>{"use strict";V=x(require("path")),O=x(require("fs/promises")),Ue=x(require("os")),be=x(require("vscode")),pe=(t=>(t.Local="local",t.Global="global",t))(pe||{}),Y=class{constructor(){this.LOCAL_AGENTS_DIR=".amazonq/cli-agents";this.GLOBAL_AGENTS_DIR=V.join(".aws","amazonq","cli-agents")}static{g(this,"AgentLocationService")}getLocalAgentsPath(){let e=be.workspace.workspaceFolders;if(!e||e.length===0)throw new Error("No workspace folder found. Local agent management requires an open workspace.");return V.join(e[0].uri.fsPath,this.LOCAL_AGENTS_DIR)}hasWorkspace(){let e=be.workspace.workspaceFolders;return!!(e&&e.length>0)}getGlobalAgentsPath(){return V.join(Ue.homedir(),this.GLOBAL_AGENTS_DIR)}async ensureDirectoryExists(e){let t=e==="local"?this.getLocalAgentsPath():this.getGlobalAgentsPath();try{await O.access(t)}catch{await O.mkdir(t,{recursive:!0})}}resolveAgentPath(e,t){let o=t==="local"?this.getLocalAgentsPath():this.getGlobalAgentsPath();return V.join(o,`${e}.json`)}async detectNameConflicts(e){let t=this.resolveAgentPath(e,"local"),o=this.resolveAgentPath(e,"global"),[r,i]=await Promise.all([this.fileExists(t),this.fileExists(o)]),a=r&&i,n="use_local";return a?n="use_local":!r&&!i&&(n="rename"),{hasConflict:a,localExists:r,globalExists:i,recommendedAction:n}}async listAgentsByLocation(){let[e,t]=await Promise.all([this.getAgentsInDirectory(this.getLocalAgentsPath()),this.getAgentsInDirectory(this.getGlobalAgentsPath())]);return{local:e,global:t}}async fileExists(e){try{return await O.access(e),!0}catch{return!1}}async getAgentsInDirectory(e){try{return(await O.readdir(e)).filter(o=>o.endsWith(".json")).map(o=>V.basename(o,".json"))}catch{return[]}}}});var H={};z(H,{AgentConfigService:()=>xe});var We,D,P,xe,B=k(()=>{"use strict";We=x(require("vscode")),D=x(require("path")),P=x(require("fs/promises"));K();J();xe=class{static{g(this,"AgentConfigService")}constructor(e,t,o){this.logger=e,this.errorHandler=t,this.locationService=o||new Y;let r=We.workspace.workspaceFolders;!r||r.length===0?(this.workspaceRoot="",this.agentDirectoryPath="",this.logger.info("No workspace found - only global agents will be available")):(this.workspaceRoot=r[0].uri.fsPath,this.agentDirectoryPath=D.join(this.workspaceRoot,v.AGENT_DIRECTORY),this.logger.debug("AgentConfigService initialized",{workspaceRoot:this.workspaceRoot,agentDirectory:this.agentDirectoryPath}))}async ensureAgentDirectory(){if(!this.agentDirectoryPath){this.logger.debug("No workspace - skipping local agent directory creation");return}try{await P.access(this.agentDirectoryPath),this.logger.debug("Agent directory already exists",{path:this.agentDirectoryPath})}catch{this.logger.info("Creating agent directory",{path:this.agentDirectoryPath});try{await P.mkdir(this.agentDirectoryPath,{recursive:!0}),this.logger.info("Agent directory created successfully")}catch(t){let o=`Failed to create agent directory: ${this.agentDirectoryPath}`;throw this.logger.error(o,t),await this.errorHandler.handleFileSystemError(t,"create agent directory",this.agentDirectoryPath),new Error(`${o}. ${t.message}`)}}}getAgentDirectory(){return this.agentDirectoryPath}async scanAgentFiles(){try{await this.ensureAgentDirectory(),await this.locationService.ensureDirectoryExists("global");let{local:e,global:t}=await this.locationService.listAgentsByLocation(),o=e.map(a=>this.locationService.resolveAgentPath(a,"local")),r=t.map(a=>this.locationService.resolveAgentPath(a,"global")),i=[...o,...r];return this.logger.debug("Scanned agent files from both locations",{localDirectory:this.locationService.getLocalAgentsPath(),globalDirectory:this.locationService.getGlobalAgentsPath(),localCount:o.length,globalCount:r.length,totalCount:i.length,files:i}),i}catch(e){let t="Failed to scan agent files";throw this.logger.error(t,e),await this.errorHandler.handleFileSystemError(e,"scan agent files","agent directories"),new Error(`${t}: ${e.message}`)}}async readAgentConfig(e){try{this.logger.debug("Reading agent config file",{filePath:e});let t=await P.readFile(e,"utf-8"),o=JSON.parse(t),r=this.validateAgentConfig(o,{skipReservedNameCheck:!0});if(!r.isValid){let i=`Invalid agent configuration in ${e}`;throw this.logger.warn(i,{errors:r.errors}),new Error(`${i}: ${r.errors.join(", ")}`)}return this.logger.debug("Agent config read successfully",{filePath:e,agentName:o.name}),o}catch(t){if(t instanceof SyntaxError){let r=`Invalid JSON in agent configuration file: ${e}`;throw this.logger.error(r,t),await this.errorHandler.showErrorMessage(`Agent configuration file contains invalid JSON: ${D.basename(e)}`,t,["Open File","Validate JSON"]),new Error(`${r}. Please check the JSON syntax.`)}let o=`Failed to read agent configuration: ${e}`;throw this.logger.error(o,t),await this.errorHandler.handleFileSystemError(t,"read agent configuration",e),new Error(`${o}: ${t.message}`)}}async writeAgentConfig(e,t,o="local"){try{let r=this.validateAgentName(e);if(!r.isValid)throw new Error(`Invalid agent name: ${r.errors.join(", ")}`);let i=await this.locationService.detectNameConflicts(e);i.hasConflict&&this.logger.warn(`Agent name conflict detected for '${e}'`,i),t.name=e;let a=this.validateAgentConfig(t);if(!a.isValid)throw new Error(`Invalid agent configuration: ${a.errors.join(", ")}`);await this.locationService.ensureDirectoryExists(o);let n=this.locationService.resolveAgentPath(e,o),c=JSON.stringify(t,null,2);this.logger.debug("Writing agent config file",{filePath:n,agentName:e,location:o}),await P.writeFile(n,c,"utf-8"),this.logger.info("Agent configuration written successfully",{filePath:n,agentName:e})}catch(r){let i=`Failed to write agent configuration for '${e}'`;this.logger.error(i,r);let a=D.join(this.agentDirectoryPath,`${e}${v.AGENT_FILE_EXTENSION}`);throw await this.errorHandler.handleFileSystemError(r,"write agent configuration",a),new Error(`${i}: ${r.message}`)}}async deleteAgentConfig(e,t){try{let o;if(t)o=this.locationService.resolveAgentPath(e,t);else{let r=this.locationService.resolveAgentPath(e,"local"),i=this.locationService.resolveAgentPath(e,"global");if(await this.fileExists(r))o=r;else if(await this.fileExists(i))o=i;else throw new Error(`Agent configuration file not found: ${e}`)}this.logger.debug("Deleting agent config file",{filePath:o,agentName:e}),await P.unlink(o),this.logger.info("Agent configuration deleted successfully",{filePath:o,agentName:e})}catch(o){if(o.code==="ENOENT"){let i=`Agent configuration file not found: ${e}`;throw this.logger.warn(i),await this.errorHandler.showWarningMessage(`Agent '${e}' does not exist or has already been deleted.`),new Error(i)}let r=`Failed to delete agent configuration for '${e}'`;throw this.logger.error(r,o),await this.errorHandler.handleFileSystemError(o,"delete agent configuration",filePath),new Error(`${r}: ${o.message}`)}}validateAgentConfig(e,t){let o=[],r=[];if(!e.name||typeof e.name!="string")o.push("Agent name is required and must be a string");else{let a=this.validateAgentName(e.name,t?.skipReservedNameCheck);a.isValid||o.push(...a.errors)}if(e.$schema&&typeof e.$schema!="string"&&o.push("Schema reference ($schema) must be a string if provided"),typeof e.description!="string"&&o.push("Description must be a string"),!Array.isArray(e.tools))o.push("Tools must be an array");else{let a=["fs_read","fs_write","execute_bash","use_aws","gh_issue","knowledge","thinking"],n=e.tools.filter(c=>typeof c!="string"||!a.includes(c));n.length>0&&r.push(`Unknown tools detected: ${n.join(", ")}`)}Array.isArray(e.allowedTools)||o.push("AllowedTools must be an array"),Array.isArray(e.resources)?e.resources.filter(n=>typeof n!="string").length>0&&o.push("All resources must be strings"):o.push("Resources must be an array"),e.mcpServers!==void 0&&(typeof e.mcpServers!="object"||e.mcpServers===null)&&o.push("mcpServers must be an object"),e.toolAliases!==void 0&&(typeof e.toolAliases!="object"||e.toolAliases===null)&&o.push("toolAliases must be an object"),e.hooks!==void 0&&(typeof e.hooks!="object"||e.hooks===null)&&o.push("hooks must be an object"),e.toolsSettings!==void 0&&(typeof e.toolsSettings!="object"||e.toolsSettings===null)&&o.push("toolsSettings must be an object"),typeof e.useLegacyMcpJson!="boolean"&&o.push("useLegacyMcpJson must be a boolean"),e.prompt!==null&&typeof e.prompt!="string"&&o.push("prompt must be a string or null");let i={isValid:o.length===0,errors:o};return r.length>0&&(i.warnings=r),this.logger.debug("Agent config validation completed",{isValid:i.isValid,errorCount:o.length,warningCount:r.length}),i}async isAgentNameExists(e){try{let t=D.join(this.agentDirectoryPath,`${e}${v.AGENT_FILE_EXTENSION}`);return await P.access(t),!0}catch{return!1}}validateAgentName(e,t){let o=[];if(!e||typeof e!="string")return o.push("Agent name is required and must be a string"),{isValid:!1,errors:o};let r=e.trim();return r!==e&&o.push("Agent name cannot have leading or trailing whitespace"),r.length===0&&o.push("Agent name cannot be empty"),r.length<v.MIN_AGENT_NAME_LENGTH&&o.push(`Agent name must be at least ${v.MIN_AGENT_NAME_LENGTH} character(s) long`),r.length>v.MAX_AGENT_NAME_LENGTH&&o.push(`Agent name must be no more than ${v.MAX_AGENT_NAME_LENGTH} characters long`),v.VALID_NAME_PATTERN.test(r)||o.push("Agent name can only contain letters, numbers, hyphens, and underscores"),!t&&v.RESERVED_NAMES.includes(r.toLowerCase())&&o.push(`'${r}' is a reserved name and cannot be used`),/[<>:"/\\|?*]/.test(r)&&o.push("Agent name contains invalid file name characters"),{isValid:o.length===0,errors:o}}cleanEmptyFields(e){let t={};for(let[o,r]of Object.entries(e))if(r!=null)if(Array.isArray(r))r.length>0&&(t[o]=r);else if(typeof r=="object"){let i=this.cleanEmptyFields(r);Object.keys(i).length>0&&(t[o]=i)}else(r!==""||o==="prompt")&&(t[o]=r);return t}createDefaultAgentConfig(e){return this.createAgentConfigFromTemplate(e)}createAgentConfigFromTemplate(e,t){let o={...ge,name:e};if(t){if(t.description&&(o.description=t.description),t.prompt!==void 0&&(o.prompt=t.prompt),t.includeAllTools)o.tools=this.getAllAvailableTools();else if(t.includeAdvancedTools===!1)o.tools=this.getBasicTools();else if(t.additionalTools&&t.additionalTools.length>0){let r=new Set([...o.tools,...t.additionalTools]);o.tools=Array.from(r)}if(t.additionalResources&&t.additionalResources.length>0){let r=new Set([...o.resources,...t.additionalResources]);o.resources=Array.from(r)}}return o.name=e,this.logger.debug("Created agent config from template",{agentName:e,toolCount:o.tools.length,resourceCount:o.resources.length,hasCustomDescription:!!t?.description,hasCustomPrompt:t?.prompt!==void 0}),o}getAllAvailableTools(){return[...v.TEMPLATES.BASIC_TOOLS,...v.TEMPLATES.ADVANCED_TOOLS]}getBasicTools(){return[...v.TEMPLATES.BASIC_TOOLS]}createMinimalAgentConfig(e){return{$schema:v.TEMPLATES.SCHEMA_URL,name:e,description:`Minimal Q CLI Agent: ${e}`,prompt:null,mcpServers:{},tools:["fs_read","thinking"],toolAliases:{},allowedTools:["fs_read"],resources:["file://README.md"],hooks:{},toolsSettings:{},useLegacyMcpJson:!0}}createComprehensiveAgentConfig(e){return{$schema:v.TEMPLATES.SCHEMA_URL,name:e,description:`Comprehensive Q CLI Agent: ${e}`,prompt:null,mcpServers:{},tools:this.getAllAvailableTools(),toolAliases:{},allowedTools:["fs_read","fs_write","execute_bash"],resources:[...v.TEMPLATES.DEFAULT_RESOURCES,...v.TEMPLATES.COMMON_RESOURCES],hooks:{},toolsSettings:{},useLegacyMcpJson:!0}}getAgentFilePath(e){return D.join(this.agentDirectoryPath,`${e}${v.AGENT_FILE_EXTENSION}`)}extractAgentNameFromPath(e){return D.basename(e,v.AGENT_FILE_EXTENSION)}isValidAgentFilePath(e){return D.basename(e).endsWith(v.AGENT_FILE_EXTENSION)&&D.dirname(e)===this.agentDirectoryPath}isValidTool(e){return this.getAllAvailableTools().includes(e)}getTemplateSuggestions(e){let t=[],o=e.toLowerCase();return(o.includes("test")||o.includes("debug"))&&t.push({name:e,description:`Testing and debugging agent: ${e}`,includeAdvancedTools:!1,additionalResources:["file://test/**/*","file://**/*.test.*"]}),(o.includes("aws")||o.includes("cloud"))&&t.push({name:e,description:`AWS and cloud operations agent: ${e}`,includeAdvancedTools:!0,additionalTools:["use_aws"],additionalResources:["file://infrastructure/**/*","file://**/*.yml","file://**/*.yaml"]}),(o.includes("doc")||o.includes("write"))&&t.push({name:e,description:`Documentation and writing agent: ${e}`,includeAdvancedTools:!1,additionalResources:["file://docs/**/*","file://**/*.md","file://**/*.txt"]}),t.push({name:e,description:`General purpose agent: ${e}`,includeAdvancedTools:!0}),t}async fileExists(e){try{return await P.access(e),!0}catch{return!1}}validateTemplateOptions(e){let t=[],o=[];if(e.name){let i=this.validateAgentName(e.name);i.isValid||t.push(...i.errors)}if(e.additionalTools){let i=e.additionalTools.filter(a=>!this.isValidTool(a));i.length>0&&o.push(`Unknown tools will be included: ${i.join(", ")}`)}e.additionalResources&&e.additionalResources.filter(a=>typeof a!="string"||a.trim().length===0).length>0&&t.push("All additional resources must be non-empty strings");let r={isValid:t.length===0,errors:t};return o.length>0&&(r.warnings=o),r}}});var F,M,qe=k(()=>{"use strict";F=class s{constructor(e,t,o){this.operation=e;this.resource=t;this.metadata=o}static{g(this,"ErrorContext")}static forFileOperation(e,t,o){return new s(e,t,o)}static forValidation(e,t){return new s("validation",e,{value:t})}static forUserInput(e,t){return new s("user_input",e,t)}static forConfiguration(e,t){return new s("configuration",e,t)}},M=class s extends Error{constructor(t,o,r,i,a=!0){super(t);this.category=o;this.context=r;this.cause=i;this.recoverable=a;this.name="ExtensionError",Error.captureStackTrace&&Error.captureStackTrace(this,s)}static{g(this,"ExtensionError")}static validation(t,o,r,i){return new s(t,"validation",F.forValidation(o,r),i)}static fileSystem(t,o,r,i){return new s(t,"filesystem",F.forFileOperation(o,r),i)}static permission(t,o,r,i){return new s(t,"permission",new F(o,r),i,!1)}static configuration(t,o,r,i){return new s(t,"configuration",F.forConfiguration(o,r),i)}static userInput(t,o,r,i){return new s(t,"user_input",F.forUserInput(o,r),i)}static system(t,o,r){return new s(t,"system",new F(o),r,!1)}static fromError(t,o,r){return new s(t.message,o,r,t)}toJSON(){return{name:this.name,message:this.message,category:this.category,context:{operation:this.context.operation,resource:this.context.resource,metadata:this.context.metadata},recoverable:this.recoverable,stack:this.stack,cause:this.cause?{name:this.cause.name,message:this.cause.message,stack:this.cause.stack}:void 0}}}});var Ge={};z(Ge,{ErrorHandler:()=>Ee,ErrorMessageBuilder:()=>Se});var Ee,Se,je=k(()=>{"use strict";qe();Ee=class{constructor(e,t){this.logger=e;this.vscodeAdapter=t}static{g(this,"ErrorHandler")}async handleError(e,t){let o;e instanceof M?o=e:o=M.fromError(e,this.categorizeError(e),t||new F("unknown")),this.logger.error("Extension error occurred",o);let r=this.createUserFriendlyMessage(o);o.recoverable?await this.vscodeAdapter.showWarningMessage(r,"Retry","Ignore"):await this.vscodeAdapter.showErrorMessage(r,"OK")}async handleFileSystemError(e,t,o){let r=M.fileSystem(`Failed to ${t}: ${e.message}`,t,o,e);await this.handleError(r)}async handleValidationError(e,t){let o=`Validation failed for ${t}: ${e.join(", ")}`,r=M.validation(o,t,{errors:e});await this.handleError(r)}async handleUserInputError(e,t){let o=M.userInput(`Invalid ${t}: ${e.message}`,t,void 0,e);await this.handleError(o)}createUserFriendlyMessage(e){switch(e.category){case"filesystem":return this.createFileSystemMessage(e);case"validation":return this.createValidationMessage(e);case"permission":return this.createPermissionMessage(e);case"configuration":return this.createConfigurationMessage(e);case"user_input":return this.createUserInputMessage(e);case"network":return this.createNetworkMessage(e);case"system":return this.createSystemMessage(e);default:return`An unexpected error occurred: ${e.message}`}}categorizeError(e){let t=e.message.toLowerCase();return t.includes("enoent")||t.includes("file not found")?"filesystem":t.includes("eacces")||t.includes("permission denied")?"permission":t.includes("invalid")||t.includes("validation")?"validation":t.includes("network")||t.includes("timeout")?"network":t.includes("config")?"configuration":"system"}createFileSystemMessage(e){let{operation:t,resource:o}=e.context,r=e.cause;return r?.message.includes("ENOENT")?`File not found: ${o}. Please check if the file exists and try again.`:r?.message.includes("EACCES")?`Permission denied: ${o}. Please check file permissions and try again.`:r?.message.includes("EISDIR")?`Expected a file but found a directory: ${o}`:r?.message.includes("ENOTDIR")?`Expected a directory but found a file: ${o}`:`Failed to ${t} "${o}": ${e.message}. Please check the file path and permissions.`}createValidationMessage(e){let{resource:t,metadata:o}=e.context;return o?.errors&&Array.isArray(o.errors)?`Validation failed for ${t}:
\u2022 ${o.errors.join(`
\u2022 `)}`:`Invalid ${t}: ${e.message}. Please check your input and try again.`}createPermissionMessage(e){let{operation:t,resource:o}=e.context;return`Permission denied while trying to ${t} "${o}". Please check your file permissions or run VS Code with appropriate privileges.`}createConfigurationMessage(e){let{resource:t}=e.context;return`Configuration error in ${t}: ${e.message}. Please check your configuration file format and values.`}createUserInputMessage(e){let{resource:t}=e.context;return`Invalid ${t}: ${e.message}. Please provide a valid value and try again.`}createNetworkMessage(e){return`Network error: ${e.message}. Please check your internet connection and try again.`}createSystemMessage(e){return`System error: ${e.message}. Please try again or restart VS Code if the problem persists.`}},Se=class{static{g(this,"ErrorMessageBuilder")}static buildFileSystemErrorMessage(e,t,o){return e.message.includes("ENOENT")?`File not found: ${o}. Please check if the file exists and try again.`:e.message.includes("EACCES")?`Permission denied: ${o}. Please check file permissions.`:e.message.includes("EISDIR")?`Expected a file but found a directory: ${o}`:`Failed to ${t}: ${e.message}`}static buildValidationErrorMessage(e,t,o){return`Invalid ${e}: "${t}" ${o}`}static buildConfigurationErrorMessage(e,t){return`Configuration error in ${e}: ${t}`}}});var Ze={};z(Ze,{WizardWebviewProvider:()=>Ae});var $,Ae,Xe=k(()=>{"use strict";$=x(require("vscode"));se();Ve();He();Ae=class{constructor(e,t){this.context=e;this.logger=t;this.disposables=[];this.stateService=new ce(t),this.validationService=new de(t),this.initializeServices()}static{g(this,"WizardWebviewProvider")}async initializeServices(){try{let{AgentConfigService:e}=await Promise.resolve().then(()=>(B(),H)),t=new e(this.logger);this.validationService.setAgentConfigService(t)}catch(e){this.logger.warn("Failed to initialize agent config service for validation",e)}}async showWizard(){if(this.panel){this.panel.reveal();return}this.panel=$.window.createWebviewPanel("agentWizard","Create New Agent",$.ViewColumn.One,{enableScripts:!0,retainContextWhenHidden:!0,localResourceRoots:[this.context.extensionUri]}),this.panel.webview.html=this.getWebviewContent(),this.panel.webview.onDidReceiveMessage(e=>this.handleWizardMessage(e),void 0,this.disposables),this.panel.onDidDispose(()=>this.dispose(),null,this.disposables),setTimeout(()=>{this.sendResponse({type:"stateUpdate",state:this.stateService.getState()})},100)}async handleWizardMessage(e){try{switch(e.type){case"requestInitialState":this.sendResponse({type:"stateUpdate",state:this.stateService.getState()});break;case"stepChanged":e.step&&await this.changeStep(e.step);break;case"dataUpdated":e.data&&await this.updateStepData(e.data);break;case"validationRequested":await this.validateCurrentStep();break;case"wizardCompleted":await this.completeWizard();break;case"openAgentConfig":await this.openAgentConfig(e.agentName);break;case"createAnother":await this.createAnother();break}}catch(t){this.logger.error("Error handling wizard message",t)}}async openAgentConfig(e){if(e)try{let{AgentConfigService:t}=await Promise.resolve().then(()=>(B(),H)),r=new t(this.logger).getAgentFilePath(e);if(r){let i=await $.workspace.openTextDocument(r);await $.window.showTextDocument(i)}this.panel?.dispose()}catch(t){this.logger.error("Failed to open agent config",t),$.window.showErrorMessage(`Failed to open agent configuration: ${t.message}`)}}async createAnother(){this.stateService.reset(),this.panel&&(this.panel.webview.html=this.getWebviewContent())}async changeStep(e){let t=this.stateService.getState();if(e>t.currentStep){let o=await this.validationService.validateStep(t.currentStep,t.stepData);if(!o.isValid){this.stateService.setValidation(t.currentStep,o),this.sendResponse({type:"validationResult",validation:o,canProceed:!1});return}this.stateService.setValidation(t.currentStep,o)}if(!this.stateService.canProceedToStep(e)){this.sendResponse({type:"navigationUpdate",canProceed:!1});return}this.stateService.setCurrentStep(e),this.sendResponse({type:"stateUpdate",state:this.stateService.getState()})}async updateStepData(e){switch(this.stateService.getState().currentStep){case 1:e.basicProperties&&this.stateService.updateStepData("basicProperties",e.basicProperties);break;case 2:e.agentLocation&&this.stateService.updateStepData("agentLocation",e.agentLocation);break;case 3:e.toolsSelection&&this.stateService.updateStepData("toolsSelection",e.toolsSelection);break;case 4:e.resources&&this.stateService.updateStepData("resources",e.resources);break;case 5:e.hookConfiguration&&this.stateService.updateStepData("hookConfiguration",e.hookConfiguration);break}}async validateCurrentStep(){let e=this.stateService.getState(),t=await this.validationService.validateStep(e.currentStep,e.stepData);this.stateService.setValidation(e.currentStep,t),this.sendResponse({type:"validationResult",validation:t,canProceed:t.isValid})}async completeWizard(){let e=this.stateService.getState();try{for(let l=1;l<6;l++){let d=await this.validationService.validateStep(l,e.stepData);if(!d.isValid){this.sendResponse({type:"validationResult",validation:d,canProceed:!1});return}}let t=this.buildAgentConfig(e.stepData),{AgentConfigService:o}=await Promise.resolve().then(()=>(B(),H)),{AgentLocationService:r}=await Promise.resolve().then(()=>(J(),ye)),{ErrorHandler:i}=await Promise.resolve().then(()=>(je(),Ge)),a=new r,n=new i(this.logger),c=new o(this.logger,n,a),m=e.stepData.agentLocation.location==="global"?"global":"local";await c.writeAgentConfig(e.stepData.basicProperties.name,t,m),this.logger.info("Agent created successfully",{name:e.stepData.basicProperties.name,location:e.stepData.agentLocation.location}),this.sendResponse({type:"agentCreated",agentName:e.stepData.basicProperties.name,location:e.stepData.agentLocation.location}),this.stateService.clearState(),setTimeout(()=>{this.panel?.dispose()},2e3)}catch(t){this.logger.error("Failed to create agent",t),this.sendResponse({type:"validationResult",validation:{isValid:!1,errors:[`Failed to create agent: ${t.message}`]},canProceed:!1})}}buildAgentConfig(e){let{basicProperties:t,toolsSelection:o,resources:r,hookConfiguration:i}=e,a={$schema:"https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json",name:t.name,description:t.description||"Custom Q CLI Agent",prompt:t.prompt||"",mcpServers:{},tools:[],toolAliases:{},allowedTools:["fs_read"],resources:[],hooks:{},toolsSettings:{},useLegacyMcpJson:!0},n=[...o.standardTools,...o.experimentalTools];if(n.length>0&&(a.tools=n),r.resources.length>0&&(a.resources=r.resources),i&&!i.skipHooks&&i.hooks.length>0){let c={};i.hooks.forEach(m=>{c[m.trigger]||(c[m.trigger]=[]),c[m.trigger].push({command:m.command})}),a.hooks=c}return a}sendResponse(e){this.panel?.webview.postMessage(e)}getWebviewContent(){return`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Create New Agent</title>
                <style>
                    /* VS Code Design System Variables */
                    :root {
                        --wizard-spacing-xs: 4px;
                        --wizard-spacing-sm: 8px;
                        --wizard-spacing-md: 12px;
                        --wizard-spacing-lg: 16px;
                        --wizard-spacing-xl: 20px;
                        --wizard-spacing-xxl: 24px;
                        --wizard-spacing-xxxl: 32px;
                        
                        --wizard-border-radius-sm: 2px;
                        --wizard-border-radius-md: 4px;
                        --wizard-border-radius-lg: 6px;
                        --wizard-border-radius-xl: 8px;
                        
                        --wizard-font-size-xs: 11px;
                        --wizard-font-size-sm: 12px;
                        --wizard-font-size-md: 14px;
                        --wizard-font-size-lg: 16px;
                        --wizard-font-size-xl: 18px;
                        --wizard-font-size-xxl: 20px;
                        
                        --wizard-line-height-tight: 1.2;
                        --wizard-line-height-normal: 1.4;
                        --wizard-line-height-relaxed: 1.6;
                        
                        --wizard-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
                        --wizard-shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
                        --wizard-shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.15);
                    }
                    
                    /* Base Typography */
                    body { 
                        font-family: var(--vscode-font-family);
                        font-size: var(--wizard-font-size-sm);
                        line-height: var(--wizard-line-height-normal);
                        color: var(--vscode-foreground);
                        background: var(--vscode-editor-background);
                        margin: 0;
                        padding: var(--wizard-spacing-lg);
                    }
                    
                    h1, h2, h3, h4, h5, h6 {
                        font-family: var(--vscode-font-family);
                        font-weight: 600;
                        line-height: var(--wizard-line-height-tight);
                        margin: 0 0 var(--wizard-spacing-md) 0;
                        color: var(--vscode-foreground);
                    }
                    
                    h2 {
                        font-size: var(--wizard-font-size-lg);
                        margin-bottom: var(--wizard-spacing-sm);
                    }
                    
                    h3 {
                        font-size: var(--wizard-font-size-md);
                    }
                    
                    p {
                        margin: 0 0 var(--wizard-spacing-md) 0;
                        color: var(--vscode-descriptionForeground);
                        line-height: var(--wizard-line-height-relaxed);
                        font-size: var(--wizard-font-size-sm);
                    }
                    
                    code {
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--wizard-font-size-xs);
                        background: var(--vscode-textCodeBlock-background);
                        color: var(--vscode-textPreformat-foreground);
                        padding: 2px var(--wizard-spacing-xs);
                        border-radius: var(--wizard-border-radius-sm);
                        border: 1px solid var(--vscode-input-border);
                    }
                    
                    /* Wizard Container */
                    .wizard-container {
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    
                    /* Progress Bar Enhancement */
                    .progress-bar {
                        display: flex;
                        gap: var(--wizard-spacing-xs);
                        margin-bottom: var(--wizard-spacing-lg);
                        background: var(--vscode-editor-background);
                        border-radius: var(--wizard-border-radius-lg);
                        padding: var(--wizard-spacing-xs);
                        border: 1px solid var(--vscode-input-border);
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                    }
                    
                    .step {
                        flex: 1;
                        min-width: 120px;
                        text-align: center;
                        padding: var(--wizard-spacing-sm) var(--wizard-spacing-xs);
                        border-radius: var(--wizard-border-radius-md);
                        font-size: var(--wizard-font-size-xs);
                        font-weight: 500;
                        color: var(--vscode-descriptionForeground);
                        cursor: pointer;
                        position: relative;
                        white-space: nowrap;
                    }
                    
                    .step:hover {
                        background: var(--vscode-list-hoverBackground);
                        color: var(--vscode-foreground);
                    }
                    
                    .step.active {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        font-weight: 600;
                        box-shadow: var(--wizard-shadow-sm);
                    }
                    
                    .step.completed {
                        background: var(--vscode-inputValidation-infoBackground);
                        color: var(--vscode-inputValidation-infoForeground);
                        font-weight: 500;
                    }
                    
                    .step.completed::after {
                        content: '\u2713';
                        position: absolute;
                        top: 2px;
                        right: 4px;
                        font-size: var(--wizard-font-size-xs);
                        color: var(--vscode-charts-green);
                    }
                    
                    /* Step Content Enhancement */
                    .step-content {
                        min-height: 300px;
                        padding: var(--wizard-spacing-lg) 0;
                        transition: none;
                    }
                    
                    /* Form Elements Enhancement */
                    .form-group {
                        margin-bottom: var(--wizard-spacing-lg);
                    }
                    
                    .form-label {
                        display: block;
                        margin-bottom: var(--wizard-spacing-xs);
                        font-weight: 500;
                        font-size: var(--wizard-font-size-sm);
                        color: var(--vscode-foreground);
                    }
                    
                    .required {
                        color: var(--vscode-errorForeground);
                        font-weight: 600;
                    }
                    
                    .form-input {
                        width: 100%;
                        padding: var(--wizard-spacing-sm) var(--wizard-spacing-md);
                        border: 1px solid var(--vscode-input-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border-radius: var(--wizard-border-radius-md);
                        font-family: var(--vscode-font-family);
                        font-size: var(--wizard-font-size-sm);
                        box-sizing: border-box;
                    }
                    
                    .form-input:focus {
                        outline: none;
                        border-color: var(--vscode-focusBorder);
                        box-shadow: 0 0 0 1px var(--vscode-focusBorder);
                    }
                    
                    .form-input:hover:not(:focus) {
                        border-color: var(--vscode-input-border);
                        background: var(--vscode-input-background);
                    }
                    
                    .form-textarea {
                        min-height: 80px;
                        resize: vertical;
                        font-family: var(--vscode-font-family);
                        line-height: var(--wizard-line-height-normal);
                    }
                    
                    .form-textarea.code-style {
                        min-height: 100px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--wizard-font-size-sm);
                        line-height: var(--wizard-line-height-normal);
                        background: var(--vscode-input-background);
                    }
                    
                    .form-help {
                        font-size: var(--wizard-font-size-xs);
                        color: var(--vscode-descriptionForeground);
                        margin-top: var(--wizard-spacing-xs);
                        line-height: var(--wizard-line-height-normal);
                    }
                    
                    /* Validation Messages Enhancement */
                    .validation-error {
                        color: var(--vscode-errorForeground);
                        font-size: var(--wizard-font-size-sm);
                        margin-top: var(--wizard-spacing-xs);
                        display: none;
                        padding: var(--wizard-spacing-xs) var(--wizard-spacing-sm);
                        background: var(--vscode-inputValidation-errorBackground);
                        border: 1px solid var(--vscode-inputValidation-errorBorder);
                        border-radius: var(--wizard-border-radius-sm);
                    }
                    
                    .validation-error.show {
                        display: block;
                        animation: slideIn 0.2s ease;
                    }
                    
                    .validation-warning {
                        color: var(--vscode-inputValidation-warningForeground);
                        font-size: var(--wizard-font-size-sm);
                        margin-top: var(--wizard-spacing-xs);
                        display: none;
                        padding: var(--wizard-spacing-xs) var(--wizard-spacing-sm);
                        background: var(--vscode-inputValidation-warningBackground);
                        border: 1px solid var(--vscode-inputValidation-warningBorder);
                        border-radius: var(--wizard-border-radius-sm);
                    }
                    
                    .validation-warning.show {
                        display: block;
                        animation: slideIn 0.2s ease;
                    }
                    
                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-4px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .char-counter {
                        font-size: var(--wizard-font-size-xs);
                        color: var(--vscode-descriptionForeground);
                        text-align: right;
                        margin-top: var(--wizard-spacing-xs);
                        font-family: var(--vscode-editor-font-family);
                    }
                    /* Navigation Enhancement */
                    .navigation {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-top: var(--wizard-spacing-lg);
                        padding-top: var(--wizard-spacing-md);
                        border-top: 1px solid var(--vscode-input-border);
                        position: relative;
                    }
                    
                    .navigation #nextBtn {
                        margin-left: auto;
                    }
                    
                    .step-counter {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        font-size: var(--wizard-font-size-sm);
                        color: var(--vscode-descriptionForeground);
                        font-weight: 500;
                        background: var(--vscode-editor-background);
                        padding: 0 var(--wizard-spacing-md);
                    }
                    
                    /* Button System Enhancement */
                    button {
                        padding: var(--wizard-spacing-md) var(--wizard-spacing-xl);
                        border: 1px solid var(--vscode-button-border);
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        cursor: pointer;
                        border-radius: var(--wizard-border-radius-md);
                        font-family: var(--vscode-font-family);
                        font-size: var(--wizard-font-size-md);
                        font-weight: 500;
                        position: relative;
                        min-width: 80px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: var(--wizard-spacing-sm);
                    }
                    
                    button:hover:not(:disabled) {
                        background: var(--vscode-button-hoverBackground);
                        transform: translateY(-1px);
                        box-shadow: var(--wizard-shadow-md);
                    }
                    
                    button:active:not(:disabled) {
                        transform: translateY(0);
                        box-shadow: var(--wizard-shadow-sm);
                    }
                    
                    button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                        transform: none;
                        box-shadow: none;
                    }
                    
                    button:focus {
                        outline: none;
                        box-shadow: 0 0 0 2px var(--vscode-focusBorder);
                    }
                    
                    .primary {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        font-weight: 600;
                    }
                    
                    .primary:hover:not(:disabled) {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border-color: var(--vscode-input-border);
                    }
                    
                    .secondary:hover:not(:disabled) {
                        background: var(--vscode-button-secondaryHoverBackground);
                        border-color: var(--vscode-focusBorder);
                    }
                    
                    .create-btn {
                        background: var(--vscode-button-background);
                        font-weight: 600;
                        min-width: 120px;
                    }
                    
                    .create-btn:hover:not(:disabled) {
                        background: var(--vscode-button-hoverBackground);
                        transform: translateY(-2px);
                        box-shadow: var(--wizard-shadow-lg);
                    }
                    
                    /* Loading States */
                    button.loading {
                        color: transparent;
                        pointer-events: none;
                    }
                    
                    .spinner {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 16px;
                        height: 16px;
                        border: 2px solid transparent;
                        border-top: 2px solid currentColor;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        color: var(--vscode-button-foreground);
                    }
                    
                    @keyframes spin {
                        0% { transform: translate(-50%, -50%) rotate(0deg); }
                        100% { transform: translate(-50%, -50%) rotate(360deg); }
                    }
                    
                    /* Step Transition Animations */
                    .step-transition-out {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    
                    .step-transition-in {
                        opacity: 0;
                        transform: translateX(20px);
                        animation: stepIn 0.3s ease forwards;
                    }
                    
                    @keyframes stepIn {
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                    
                    /* Error Summary Enhancement */
                    .error-summary {
                        display: flex;
                        align-items: flex-start;
                        gap: var(--wizard-spacing-md);
                        background: var(--vscode-inputValidation-errorBackground);
                        border: 1px solid var(--vscode-inputValidation-errorBorder);
                        border-radius: var(--wizard-border-radius-lg);
                        padding: var(--wizard-spacing-lg);
                        margin-top: var(--wizard-spacing-xl);
                        opacity: 0;
                        transform: translateY(-10px);
                        box-shadow: var(--wizard-shadow-md);
                    }
                    
                    .error-summary.show {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    
                    .error-icon {
                        font-size: var(--wizard-font-size-xl);
                        flex-shrink: 0;
                    }
                    
                    .error-text {
                        color: var(--vscode-inputValidation-errorForeground);
                        font-size: var(--wizard-font-size-md);
                        line-height: var(--wizard-line-height-normal);
                    }
                    
                    .error-text strong {
                        display: block;
                        margin-bottom: var(--wizard-spacing-sm);
                        font-weight: 600;
                    }
                    
                    .error-text ul {
                        margin: 0;
                        padding-left: var(--wizard-spacing-lg);
                    }
                    
                    .error-text li {
                        margin-bottom: var(--wizard-spacing-xs);
                        line-height: var(--wizard-line-height-normal);
                    }
                    
                    /* Responsive Layout System */
                    @media (max-width: 768px) {
                        body {
                            padding: var(--wizard-spacing-md);
                        }
                        
                        .wizard-container {
                            max-width: 100%;
                        }
                        
                        .progress-bar {
                            padding: var(--wizard-spacing-sm);
                            gap: var(--wizard-spacing-xs);
                        }
                        
                        .step {
                            min-width: 100px;
                            padding: var(--wizard-spacing-sm) var(--wizard-spacing-xs);
                            font-size: var(--wizard-font-size-xs);
                        }
                        
                        .step-content {
                            padding: var(--wizard-spacing-lg) 0;
                            min-height: 300px;
                        }
                        
                        .navigation {
                            flex-direction: column;
                            gap: var(--wizard-spacing-md);
                            align-items: stretch;
                        }
                        
                        .navigation > div {
                            display: flex;
                            gap: var(--wizard-spacing-md);
                            justify-content: center;
                        }
                        
                        .step-counter {
                            position: static;
                            transform: none;
                            order: -1;
                            text-align: center;
                            background: transparent;
                            padding: 0;
                        }
                        
                        button {
                            flex: 1;
                            min-width: 0;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        .progress-bar {
                            padding: var(--wizard-spacing-xs);
                        }
                        
                        .step {
                            min-width: 80px;
                            padding: var(--wizard-spacing-xs);
                            font-size: 10px;
                        }
                        
                        .form-input, .form-textarea {
                            font-size: var(--wizard-font-size-lg);
                            padding: var(--wizard-spacing-lg);
                        }
                        
                        .navigation > div {
                            flex-direction: column;
                        }
                        
                        button {
                            padding: var(--wizard-spacing-lg) var(--wizard-spacing-xl);
                            font-size: var(--wizard-font-size-lg);
                        }
                    }
                    
                    /* Enhanced Animations */
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    @keyframes fadeInLeft {
                        from {
                            opacity: 0;
                            transform: translateX(-20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                    
                    @keyframes fadeInRight {
                        from {
                            opacity: 0;
                            transform: translateX(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                    
                    @keyframes pulse {
                        0%, 100% {
                            transform: scale(1);
                        }
                        50% {
                            transform: scale(1.05);
                        }
                    }
                    
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-4px); }
                        75% { transform: translateX(4px); }
                    }
                    
                    /* Step Content Animations */
                    .step-content {
                        animation: none;
                    }
                    
                    .step-transition-out {
                        opacity: 1;
                        transform: none;
                        transition: none;
                    }
                    
                    .step-transition-in {
                        animation: none;
                    }
                    
                    /* Form Animation Enhancements */
                    .form-group {
                        animation: none;
                        animation-fill-mode: none;
                    }
                    
                    .form-input:focus {
                        animation: none;
                    }
                    
                    .validation-error.show {
                        animation: shake 0.5s ease, slideIn 0.3s ease;
                    }
                    
                    /* Button Animation Enhancements */
                    button {
                        transform-origin: center;
                    }
                    
                    button:hover:not(:disabled) {
                        animation: pulse 0.3s ease;
                    }
                    
                    button:active:not(:disabled) {
                        transform: scale(0.98);
                    }
                    
                    .create-btn:hover:not(:disabled) {
                        animation: pulse 0.4s ease infinite alternate;
                    }
                    
                    /* Progress Bar Animations */
                    .step {
                        transform-origin: center;
                    }
                    
                    .step.active {
                        animation: pulse 0.5s ease;
                    }
                    
                    .step.completed {
                        animation: fadeInLeft 0.3s ease;
                    }
                    
                    .step.completed::after {
                        animation: fadeInUp 0.4s ease 0.2s both;
                    }
                    
                    /* Location Cards Responsive Enhancement */
                    .location-cards {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: var(--wizard-spacing-xl);
                        margin: var(--wizard-spacing-lg) 0;
                    }
                    
                    @media (max-width: 768px) {
                        .location-cards {
                            grid-template-columns: 1fr;
                            gap: var(--wizard-spacing-lg);
                            margin: var(--wizard-spacing-xl) 0;
                        }
                    }
                    
                    .location-card {
                        border: 2px solid var(--vscode-input-border);
                        border-radius: var(--wizard-border-radius-xl);
                        padding: var(--wizard-spacing-lg);
                        cursor: pointer;
                        background: var(--vscode-input-background);
                        text-align: center;
                        position: relative;
                        animation: none;
                    }
                    
                    .location-card:nth-child(1) { animation: none; }
                    .location-card:nth-child(2) { animation: none; }
                    
                    .location-card:hover {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-hoverBackground);
                        transform: translateY(-4px) scale(1.02);
                        box-shadow: var(--wizard-shadow-lg);
                    }
                    
                    .location-card.selected {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                        transform: scale(1.05);
                        box-shadow: var(--wizard-shadow-lg);
                        animation: pulse 0.5s ease;
                    }
                    
                    @media (max-width: 480px) {
                        .location-card {
                            padding: var(--wizard-spacing-xl);
                        }
                        
                        .card-icon {
                            font-size: 40px;
                            margin-bottom: var(--wizard-spacing-md);
                        }
                        
                        .card-title {
                            font-size: var(--wizard-font-size-lg);
                        }
                    }
                    
                    /* Tools Selection Responsive Enhancement */
                    .tools-tabs {
                        display: flex;
                        border-bottom: 1px solid var(--vscode-input-border);
                        margin-bottom: var(--wizard-spacing-xl);
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                    }
                    
                    @media (max-width: 480px) {
                        .tools-tabs {
                            flex-direction: column;
                            border-bottom: none;
                            border-right: 1px solid var(--vscode-input-border);
                            margin-bottom: var(--wizard-spacing-lg);
                        }
                        
                        .tab-button {
                            border-bottom: none;
                            border-right: 2px solid transparent;
                            text-align: left;
                            justify-content: flex-start;
                        }
                        
                        .tab-button.active {
                            border-right-color: var(--vscode-focusBorder);
                            border-bottom-color: transparent;
                        }
                    }
                    
                    .tab-panel {
                        animation: fadeInUp 0.4s ease;
                    }
                    
                    .tool-card {
                        animation: fadeInUp 0.3s ease;
                        animation-fill-mode: both;
                    }
                    
                    .tool-card:nth-child(1) { animation-delay: 0.1s; }
                    .tool-card:nth-child(2) { animation-delay: 0.2s; }
                    .tool-card:nth-child(3) { animation-delay: 0.3s; }
                    .tool-card:nth-child(4) { animation-delay: 0.4s; }
                    .tool-card:nth-child(5) { animation-delay: 0.5s; }
                    
                    .tool-card:hover {
                        transform: none;
                        box-shadow: none;
                    }
                    
                    .tool-card.selected {
                        transform: none;
                        animation: none;
                    }
                    
                    /* Resources Section Responsive Enhancement */
                    .resources-section {
                        display: flex;
                        flex-direction: column;
                        gap: var(--wizard-spacing-xxl);
                    }
                    
                    .drop-zone {
                        border: 2px dashed var(--vscode-input-border);
                        border-radius: var(--wizard-border-radius-xl);
                        padding: var(--wizard-spacing-xxxl) var(--wizard-spacing-xl);
                        text-align: center;
                        cursor: pointer;
                        background: var(--vscode-input-background);
                    }
                    }
                    
                    .drop-zone:hover,
                    .drop-zone.drag-over {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-hoverBackground);
                        transform: scale(1.02);
                        box-shadow: var(--wizard-shadow-md);
                    }
                    
                    .drop-zone.drag-over {
                        animation: pulse 0.5s ease infinite alternate;
                    }
                    
                    @media (max-width: 768px) {
                        .drop-zone {
                            padding: var(--wizard-spacing-xl) var(--wizard-spacing-lg);
                        }
                        
                        .drop-icon {
                            font-size: 40px;
                            margin-bottom: var(--wizard-spacing-md);
                        }
                        
                        .drop-text {
                            font-size: var(--wizard-font-size-md);
                        }
                    }
                    
                    .resource-item {
                        animation: fadeInLeft 0.3s ease;
                        animation-fill-mode: both;
                    }
                    
                    .resource-item:nth-child(1) { animation: none; }
                    .resource-item:nth-child(2) { animation: none; }
                    .resource-item:nth-child(3) { animation: none; }
                    .resource-item:nth-child(4) { animation: none; }
                    
                    .resource-item:hover {
                        transform: translateX(4px);
                        box-shadow: var(--wizard-shadow-sm);
                    }
                    
                    /* Summary Page Responsive Enhancement */
                    .summary-sections {
                        display: flex;
                        flex-direction: column;
                        gap: var(--wizard-spacing-xxl);
                        margin-bottom: var(--wizard-spacing-xxl);
                    }
                    
                    .summary-section {
                        animation: fadeInUp 0.4s ease;
                        animation-fill-mode: both;
                    }
                    
                    .summary-section:nth-child(1) { animation-delay: 0.1s; }
                    .summary-section:nth-child(2) { animation-delay: 0.2s; }
                    .summary-section:nth-child(3) { animation-delay: 0.3s; }
                    .summary-section:nth-child(4) { animation-delay: 0.4s; }
                    
                    @media (max-width: 768px) {
                        .summary-header {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: var(--wizard-spacing-md);
                        }
                        
                        .summary-item {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: var(--wizard-spacing-sm);
                        }
                        
                        .summary-label {
                            min-width: auto;
                        }
                        
                        .location-summary {
                            flex-direction: column;
                            text-align: center;
                            gap: var(--wizard-spacing-md);
                        }
                    }
                    
                    .creation-info {
                        animation: fadeInUp 0.5s ease 0.5s both;
                    }
                    
                    /* Success Page Styling */
                    .success-container {
                        text-align: center;
                        padding: var(--wizard-spacing-xxxl) var(--wizard-spacing-xl);
                        animation: fadeInUp 0.6s ease;
                    }
                    
                    .success-icon {
                        font-size: 80px;
                        margin-bottom: var(--wizard-spacing-xl);
                        animation: pulse 1s ease infinite alternate;
                    }
                    
                    .success-container h2 {
                        color: var(--vscode-charts-green);
                        margin-bottom: var(--wizard-spacing-xxl);
                        font-size: var(--wizard-font-size-xxl);
                    }
                    
                    .success-details {
                        background: var(--vscode-inputValidation-infoBackground);
                        border: 1px solid var(--vscode-inputValidation-infoBorder);
                        border-radius: var(--wizard-border-radius-lg);
                        padding: var(--wizard-spacing-xl);
                        margin: var(--wizard-spacing-xxl) 0;
                        display: inline-block;
                        text-align: left;
                        min-width: 300px;
                    }
                    
                    .success-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: var(--wizard-spacing-md);
                        padding: var(--wizard-spacing-sm) 0;
                        border-bottom: 1px solid var(--vscode-input-border);
                    }
                    
                    .success-item:last-child {
                        margin-bottom: 0;
                        border-bottom: none;
                    }
                    
                    .success-label {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .success-value {
                        color: var(--vscode-inputValidation-infoForeground);
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--wizard-font-size-sm);
                    }
                    
                    .success-actions {
                        display: flex;
                        gap: var(--wizard-spacing-lg);
                        justify-content: center;
                        margin-top: var(--wizard-spacing-xxl);
                    }
                    
                    @media (max-width: 480px) {
                        .success-container {
                            padding: var(--wizard-spacing-xl) var(--wizard-spacing-md);
                        }
                        
                        .success-icon {
                            font-size: 60px;
                        }
                        
                        .success-details {
                            min-width: auto;
                            width: 100%;
                        }
                        
                        .success-actions {
                            flex-direction: column;
                        }
                    }
                    
                    .location-card.selected::before {
                        content: '\u2713';
                        position: absolute;
                        top: 12px;
                        right: 12px;
                        width: 20px;
                        height: 20px;
                        background: var(--vscode-focusBorder);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        font-weight: bold;
                    }
                    
                    .card-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                        line-height: 1;
                    }
                    
                    .card-title {
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 8px;
                        color: var(--vscode-foreground);
                    }
                    
                    .location-card.selected .card-title {
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                    
                    .card-description {
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 16px;
                        font-weight: 500;
                    }
                    
                    .location-card.selected .card-description {
                        color: var(--vscode-list-activeSelectionForeground);
                        opacity: 0.9;
                    }
                    
                    .card-details {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        text-align: left;
                        line-height: 1.5;
                        background: var(--vscode-editor-background);
                        padding: 12px;
                        border-radius: 4px;
                        border: 1px solid var(--vscode-input-border);
                    }
                    
                    .location-card.selected .card-details {
                        background: rgba(255, 255, 255, 0.1);
                        border-color: rgba(255, 255, 255, 0.2);
                        color: var(--vscode-list-activeSelectionForeground);
                        opacity: 0.9;
                    }
                    
                    .card-details code {
                        background: var(--vscode-textCodeBlock-background);
                        color: var(--vscode-textPreformat-foreground);
                        padding: 2px 4px;
                        border-radius: 2px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: 11px;
                    }
                    
                    .location-card.selected .card-details code {
                        background: rgba(255, 255, 255, 0.2);
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                    
                    /* Responsive design */
                    @media (max-width: 600px) {
                        .location-cards {
                            grid-template-columns: 1fr;
                            gap: 16px;
                        }
                        
                        .location-card {
                            padding: 20px;
                        }
                        
                        .card-icon {
                            font-size: 40px;
                            margin-bottom: 12px;
                        }
                        
                        .card-title {
                            font-size: 16px;
                        }
                    }
                    
                    /* Navigation Enhancements */
                    .navigation {
                        position: relative;
                    }
                    
                    .step-counter {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        font-weight: 500;
                    }
                    
                    button.loading {
                        position: relative;
                        color: transparent;
                    }
                    
                    .spinner {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 16px;
                        height: 16px;
                        border: 2px solid transparent;
                        border-top: 2px solid currentColor;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        color: var(--vscode-button-foreground);
                    }
                    
                    @keyframes spin {
                        0% { transform: translate(-50%, -50%) rotate(0deg); }
                        100% { transform: translate(-50%, -50%) rotate(360deg); }
                    }
                    
                    .create-btn {
                        background: var(--vscode-button-background);
                        font-weight: 600;
                    }
                    
                    .create-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                        transform: translateY(-1px);
                    }
                    
                    /* Step Transition Animations */
                    .step-content {
                    }
                    
                    .step-transition-out {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    
                    .step-transition-in {
                        opacity: 0;
                        transform: translateX(20px);
                        animation: stepIn 0.3s ease forwards;
                    }
                    
                    @keyframes stepIn {
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                    
                    /* Error Summary */
                    .error-summary {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        background: var(--vscode-inputValidation-errorBackground);
                        border: 1px solid var(--vscode-inputValidation-errorBorder);
                        border-radius: 4px;
                        padding: 16px;
                        margin-top: 20px;
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    
                    .error-summary.show {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    
                    .error-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                    }
                    
                    .error-text {
                        color: var(--vscode-inputValidation-errorForeground);
                        font-size: 14px;
                    }
                    
                    .error-text strong {
                        display: block;
                        margin-bottom: 8px;
                    }
                    
                    .error-text ul {
                        margin: 0;
                        padding-left: 16px;
                    }
                    
                    .error-text li {
                        margin-bottom: 4px;
                    }
                    
                    /* Tools Selection Styling */
                    .tools-tabs {
                        display: flex;
                        border-bottom: 1px solid var(--vscode-input-border);
                        margin-bottom: 20px;
                    }
                    
                    .tab-button {
                        background: transparent;
                        border: none;
                        padding: 12px 20px;
                        cursor: pointer;
                        color: var(--vscode-descriptionForeground);
                        border-bottom: 2px solid transparent;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-family: var(--vscode-font-family);
                        font-size: 14px;
                    }
                    
                    .tab-button:hover {
                        color: var(--vscode-foreground);
                        background: var(--vscode-list-hoverBackground);
                    }
                    
                    .tab-button.active {
                        color: var(--vscode-focusBorder);
                        border-bottom-color: var(--vscode-focusBorder);
                        font-weight: 600;
                    }
                    
                    .experimental-badge {
                        background: var(--vscode-notificationsWarningIcon-foreground);
                        color: white;
                        font-size: 10px;
                        padding: 2px 6px;
                        border-radius: 8px;
                        font-weight: bold;
                    }
                    
                    .tab-content {
                        position: relative;
                    }
                    
                    .tab-panel {
                        display: none;
                    }
                    
                    .tab-panel.active {
                        display: block;
                        animation: fadeIn 0.3s ease;
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    
                    .experimental-warning {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        background: var(--vscode-inputValidation-warningBackground);
                        border: 1px solid var(--vscode-inputValidation-warningBorder);
                        border-radius: 6px;
                        padding: 16px;
                        margin-bottom: 20px;
                    }
                    
                    .warning-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                    }
                    
                    .warning-text {
                        color: var(--vscode-inputValidation-warningForeground);
                        font-size: 14px;
                    }
                    
                    .tools-grid {
                        display: grid;
                        gap: 8px;
                    }
                    
                    .tool-card {
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 6px;
                        padding: var(--wizard-spacing-sm);
                        cursor: pointer;
                        background: var(--vscode-input-background);
                    }
                    
                    .tool-card:hover {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-hoverBackground);
                    }
                    
                    .tool-card.selected {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                    
                    .tool-card.experimental {
                        border-left: 4px solid var(--vscode-notificationsWarningIcon-foreground);
                    }
                    
                    .tool-header {
                        display: flex;
                        align-items: flex-start;
                        gap: var(--wizard-spacing-sm);
                    }
                    
                    .tool-checkbox {
                        flex-shrink: 0;
                        margin-top: 2px;
                    }
                    
                    .tool-checkbox input[type="checkbox"] {
                        width: 16px;
                        height: 16px;
                        cursor: pointer;
                    }
                    
                    .tool-info {
                        flex: 1;
                    }
                    
                    .tool-name {
                        font-weight: 600;
                        font-size: var(--wizard-font-size-sm);
                        margin-bottom: 4px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .experimental-tag {
                        background: var(--vscode-notificationsWarningIcon-foreground);
                        color: white;
                        font-size: 9px;
                        padding: 2px 6px;
                        border-radius: 8px;
                        font-weight: bold;
                    }
                    
                    .tool-description {
                        color: var(--vscode-descriptionForeground);
                        font-size: var(--wizard-font-size-xs);
                        margin-bottom: 8px;
                    }
                    
                    .tool-card.selected .tool-description {
                        color: var(--vscode-list-activeSelectionForeground);
                        opacity: 0.9;
                    }
                    

                    
                    /* Resources Section Styling */
                    .resources-section {
                        display: flex;
                        flex-direction: column;
                        gap: 24px;
                    }
                    
                    .drop-zone {
                        border: 2px dashed var(--vscode-input-border);
                        border-radius: 8px;
                        padding: var(--wizard-spacing-lg) var(--wizard-spacing-md);
                        text-align: center;
                        cursor: pointer;
                        background: var(--vscode-input-background);
                    }
                    
                    .drop-zone:hover,
                    .drop-zone.drag-over {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-hoverBackground);
                    }
                    
                    .drop-zone-content {
                        pointer-events: none;
                    }
                    
                    .drop-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                    }
                    
                    .drop-text {
                        color: var(--vscode-foreground);
                        font-size: 16px;
                        line-height: 1.5;
                    }
                    
                    .manual-input-section {
                        position: relative;
                    }
                    
                    .input-group {
                        display: flex;
                        gap: 8px;
                        align-items: flex-start;
                    }
                    
                    .input-group .form-input {
                        flex: 1;
                    }
                    
                    .add-btn {
                        padding: 8px 16px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: 1px solid var(--vscode-button-border);
                        border-radius: 2px;
                        cursor: pointer;
                        font-family: var(--vscode-font-family);
                        font-size: 14px;
                        white-space: nowrap;
                    }
                    
                    .add-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .resource-error {
                        color: var(--vscode-errorForeground);
                        font-size: 12px;
                        margin-top: 4px;
                        opacity: 0;
                        transform: translateY(-5px);
                    }
                    
                    .resource-error.show {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    
                    .resources-list {
                        min-height: 100px;
                    }
                    
                    .empty-resources {
                        text-align: center;
                        padding: 40px 20px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .empty-icon {
                        font-size: 48px;
                        margin-bottom: 12px;
                        opacity: 0.5;
                    }
                    
                    .empty-text {
                        font-size: 16px;
                    }
                    
                    .resources-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 16px;
                    }
                    
                    .resources-header h3 {
                        margin: 0;
                        font-size: 16px;
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .resources-grid {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .resource-item {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: var(--wizard-spacing-sm);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        background: var(--vscode-input-background);
                    }
                    
                    .resource-item:hover {
                        background: var(--vscode-list-hoverBackground);
                        border-color: var(--vscode-focusBorder);
                    }
                    
                    .resource-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                    }
                    
                    .resource-info {
                        flex: 1;
                        min-width: 0;
                    }
                    
                    .resource-path {
                        font-family: var(--vscode-editor-font-family);
                        font-size: 13px;
                        color: var(--vscode-foreground);
                        word-break: break-all;
                        margin-bottom: 2px;
                    }
                    
                    .resource-type {
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                        text-transform: uppercase;
                        font-weight: 500;
                    }
                    
                    .remove-btn {
                        background: transparent;
                        border: none;
                        color: var(--vscode-errorForeground);
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 2px;
                        font-size: 14px;
                        opacity: 0.7;
                        flex-shrink: 0;
                    }
                    
                    .remove-btn:hover {
                        opacity: 1;
                        background: var(--vscode-inputValidation-errorBackground);
                    }
                    
                    /* Hook Configuration Styling */
                    .hook-configuration-section {
                        display: flex;
                        flex-direction: column;
                        gap: 24px;
                    }
                    
                    .create-hook-section {
                        display: flex;
                        justify-content: center;
                    }
                    
                    .template-card.large {
                        min-width: 200px;
                        padding: 16px;
                        text-align: center;
                    }
                    
                    .template-card.large .template-icon {
                        font-size: 28px;
                        margin-bottom: 8px;
                    }
                    
                    .template-card.large .template-info h4 {
                        font-size: 16px;
                        margin-bottom: 6px;
                    }
                    
                    .template-card.large .template-info p {
                        font-size: 12px;
                    }
                    
                    .template-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                        gap: 12px;
                        margin-top: 16px;
                    }
                    
                    .template-card {
                        padding: 12px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        background: var(--vscode-editor-background);
                    }
                    
                    .template-card:hover {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-hoverBackground);
                    }
                    
                    .template-card.custom {
                        border-style: dashed;
                    }
                    
                    .template-icon {
                        font-size: 20px;
                        margin-bottom: 6px;
                    }
                    
                    .template-info h4 {
                        margin: 0 0 4px 0;
                        font-size: 13px;
                        color: var(--vscode-foreground);
                    }
                    
                    .template-info p {
                        margin: 0;
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .empty-hooks {
                        text-align: center;
                        padding: 40px 20px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .empty-hooks .empty-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                        display: block;
                    }
                    
                    .hooks-grid {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    
                    .hook-item {
                        padding: 16px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 6px;
                        background: var(--vscode-editor-background);
                    }
                    
                    .hook-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 8px;
                    }
                    
                    .hook-name {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .hook-actions {
                        display: flex;
                        gap: 8px;
                    }
                    
                    .edit-hook-btn, .remove-hook-btn {
                        background: none;
                        border: none;
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 4px;
                        font-size: 14px;
                    }
                    
                    .edit-hook-btn:hover, .remove-hook-btn:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    
                    .trigger-badge {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 600;
                        margin-right: 8px;
                    }
                    
                    .trigger-badge.agentSpawn {
                        background: var(--vscode-charts-blue);
                        color: white;
                    }
                    
                    .trigger-badge.userPromptSubmit {
                        background: var(--vscode-charts-green);
                        color: white;
                    }
                    
                    .hook-command {
                        font-family: var(--vscode-editor-font-family);
                        font-size: 12px;
                        background: var(--vscode-textCodeBlock-background);
                        padding: 8px;
                        border-radius: 4px;
                        color: var(--vscode-textPreformat-foreground);
                        margin-top: 8px;
                    }
                    
                    .hook-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                    }
                    
                    .hook-modal-content {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 6px;
                        width: 90%;
                        max-width: 500px;
                        max-height: 80vh;
                        overflow-y: auto;
                    }
                    
                    .hook-modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 16px;
                        border-bottom: 1px solid var(--vscode-input-border);
                    }
                    
                    .hook-modal-header h3 {
                        margin: 0;
                        color: var(--vscode-foreground);
                    }
                    
                    .close-modal {
                        background: none;
                        border: none;
                        font-size: 18px;
                        cursor: pointer;
                        color: var(--vscode-foreground);
                    }
                    
                    .hook-modal-body {
                        padding: 16px;
                    }
                    
                    .form-group {
                        margin-bottom: 16px;
                    }
                    
                    .form-group label {
                        display: block;
                        margin-bottom: 4px;
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .form-group input,
                    .form-group select,
                    .form-group textarea {
                        width: 100%;
                        padding: 8px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        font-family: var(--vscode-font-family);
                    }
                    
                    .hook-modal-footer {
                        display: flex;
                        justify-content: flex-end;
                        gap: 8px;
                        padding: 16px;
                        border-top: 1px solid var(--vscode-input-border);
                    }
                    
                    .cancel-btn, .save-btn {
                        padding: 8px 16px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        cursor: pointer;
                        font-family: var(--vscode-font-family);
                    }
                    
                    .cancel-btn {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    
                    .save-btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    
                    .hooks-summary {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    
                    .hooks-count {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .hook-preview-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px;
                        background: var(--vscode-textCodeBlock-background);
                        border-radius: 4px;
                        margin-bottom: 4px;
                    }
                    
                    .hook-preview-trigger {
                        font-size: 16px;
                    }
                    
                    .hook-preview-name {
                        font-size: 12px;
                        color: var(--vscode-foreground);
                    }
                    
                    .validation-errors {
                        margin-top: 8px;
                    }
                    
                    .error-message {
                        color: var(--vscode-errorForeground);
                        font-size: 12px;
                        margin-bottom: 4px;
                    }
                    
                    /* Summary Page Styling */
                    .summary-sections {
                        display: flex;
                        flex-direction: column;
                        gap: 24px;
                        margin-bottom: 24px;
                    }
                    
                    .summary-section {
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 6px;
                        background: var(--vscode-input-background);
                    }
                    
                    .summary-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 16px 20px;
                        border-bottom: 1px solid var(--vscode-input-border);
                        background: var(--vscode-editor-background);
                    }
                    
                    .summary-header h3 {
                        margin: 0;
                        font-size: 16px;
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .edit-btn {
                        background: transparent;
                        border: 1px solid var(--vscode-button-border);
                        color: var(--vscode-button-foreground);
                        padding: 6px 12px;
                        border-radius: 2px;
                        cursor: pointer;
                        font-size: 12px;
                        font-family: var(--vscode-font-family);
                    }
                    
                    .edit-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .summary-content {
                        padding: 20px;
                    }
                    
                    .summary-item {
                        display: flex;
                        margin-bottom: 12px;
                        align-items: flex-start;
                        gap: 12px;
                    }
                    
                    .summary-label {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                        min-width: 80px;
                        flex-shrink: 0;
                    }
                    
                    .summary-value {
                        color: var(--vscode-foreground);
                        flex: 1;
                    }
                    
                    .summary-prompt {
                        background: var(--vscode-textCodeBlock-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        padding: 12px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: 13px;
                        line-height: 1.4;
                        color: var(--vscode-textPreformat-foreground);
                        white-space: pre-wrap;
                        max-height: 120px;
                        overflow-y: auto;
                        flex: 1;
                    }
                    
                    .location-summary {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }
                    
                    .location-icon {
                        font-size: 32px;
                    }
                    
                    .location-info {
                        flex: 1;
                    }
                    
                    .location-name {
                        font-weight: 600;
                        font-size: 16px;
                        color: var(--vscode-foreground);
                        margin-bottom: 4px;
                    }
                    
                    .location-desc {
                        color: var(--vscode-descriptionForeground);
                        font-size: 14px;
                    }
                    
                    .tools-summary {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }
                    
                    .tools-group-title {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .tools-list {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                    }
                    
                    .tool-tag {
                        background: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 500;
                        text-transform: uppercase;
                    }
                    
                    .tool-tag.experimental {
                        background: var(--vscode-notificationsWarningIcon-foreground);
                        color: white;
                    }
                    
                    .resources-summary {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    
                    .resources-count {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .resources-preview {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }
                    
                    .resource-preview-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 13px;
                    }
                    
                    .resource-preview-icon {
                        font-size: 14px;
                    }
                    
                    .resource-preview-path {
                        font-family: var(--vscode-editor-font-family);
                        color: var(--vscode-textPreformat-foreground);
                        word-break: break-all;
                    }
                    
                    .resource-preview-more {
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                        font-size: 12px;
                        margin-left: 22px;
                    }
                    
                    .empty-summary {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                    }
                    
                    .empty-icon {
                        font-size: 16px;
                        opacity: 0.7;
                    }
                    
                    .creation-info {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        background: var(--vscode-inputValidation-infoBackground);
                        border: 1px solid var(--vscode-inputValidation-infoBorder);
                        border-radius: 6px;
                        padding: 16px;
                        margin-top: 24px;
                    }
                    
                    .info-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                    }
                    
                    .info-text {
                        color: var(--vscode-inputValidation-infoForeground);
                        font-size: 14px;
                        line-height: 1.5;
                    }
                    
                    .info-text code {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 2px 4px;
                        border-radius: 2px;
                        font-family: var(--vscode-editor-font-family);
                    }
                </style>
            </head>
            <body>
                <div class="wizard-container">
                    <div class="progress-bar">
                        <div class="step active" data-step="1">1. Basic Properties</div>
                        <div class="step" data-step="2">2. Location</div>
                        <div class="step" data-step="3">3. Tools</div>
                        <div class="step" data-step="4">4. Resources</div>
                        <div class="step" data-step="5">5. Hooks</div>
                        <div class="step" data-step="6">6. Summary</div>
                    </div>
                    
                    <div class="step-content" id="stepContent">
                        <!-- Step content will be dynamically loaded here -->
                    </div>
                    
                    <div class="navigation">
                        <button id="prevBtn" onclick="previousStep()" disabled class="secondary">Previous</button>
                        <button id="nextBtn" onclick="nextStep()" class="primary">Next</button>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    let currentStep = 1;
                    let wizardState = null;
                    let validationTimeout = null;
                    
                    // Initialize wizard
                    window.addEventListener('message', event => {
                        const message = event.data;
                        handleWizardResponse(message);
                    });
                    
                    function handleWizardResponse(response) {
                        switch (response.type) {
                            case 'stateUpdate':
                                wizardState = response.state;
                                updateUI();
                                break;
                            case 'validationResult':
                                handleValidation(response.validation, response.canProceed);
                                break;
                            case 'agentCreated':
                                handleAgentCreated(response.agentName, response.location);
                                break;
                        }
                    }
                    
                    // Request initial state when page loads
                    function requestInitialState() {
                        vscode.postMessage({
                            type: 'requestInitialState'
                        });
                    }
                    
                    // Initialize when DOM is ready
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', requestInitialState);
                    } else {
                        requestInitialState();
                    }
                    
                    function handleWizardResponse(response) {
                        switch (response.type) {
                            case 'stateUpdate':
                                wizardState = response.state;
                                updateUI();
                                break;
                            case 'validationResult':
                                handleValidation(response.validation, response.canProceed);
                                break;
                            case 'agentCreated':
                                handleAgentCreated(response.agentName, response.location);
                                break;
                        }
                    }
                    
                    function handleAgentCreated(agentName, location) {
                        setNavigationLoading(false);
                        
                        // Show success message
                        const content = document.getElementById('stepContent');
                        content.innerHTML = \`
                            <div class="success-container">
                                <div class="success-icon">\u{1F389}</div>
                                <h2>Agent Created Successfully!</h2>
                                <div class="success-details">
                                    <div class="success-item">
                                        <span class="success-label">Name:</span>
                                        <span class="success-value">\${agentName}</span>
                                    </div>
                                    <div class="success-item">
                                        <span class="success-label">Location:</span>
                                        <span class="success-value">\${location === 'global' ? 'Global Agent' : 'Local Agent'}</span>
                                    </div>
                                    <div class="success-item">
                                        <span class="success-label">File:</span>
                                        <span class="success-value">\${agentName}.json</span>
                                    </div>
                                </div>
                                <div class="success-actions">
                                    <button onclick="openAgentConfig('\${agentName}')" class="primary">
                                        Open Configuration
                                    </button>
                                    <button onclick="createAnother()" class="secondary">
                                        Create Another
                                    </button>
                                </div>
                            </div>
                        \`;
                        
                        // Update progress bar to show completion
                        document.querySelectorAll('.step').forEach(step => {
                            step.classList.remove('active');
                            step.classList.add('completed');
                        });
                        
                        // Hide navigation
                        document.querySelector('.navigation').style.display = 'none';
                    }
                    
                    function openAgentConfig(agentName) {
                        vscode.postMessage({
                            type: 'openAgentConfig',
                            agentName: agentName
                        });
                    }
                    
                    function createAnother() {
                        vscode.postMessage({
                            type: 'createAnother'
                        });
                    }
                    
                    function updateUI() {
                        if (!wizardState) {
                            const content = document.getElementById('stepContent');
                            if (content) {
                                content.innerHTML = '<div style="text-align: center; padding: 40px;">Loading wizard...</div>';
                            }
                            return;
                        }
                        
                        const previousStep = currentStep;
                        currentStep = wizardState.currentStep;
                        
                        updateProgressBar();
                        updateStepContent();
                        updateNavigation();
                        
                        // Clear any pending navigation states
                        setNavigationLoading(false);
                    }
                    
                    function updateProgressBar() {
                        document.querySelectorAll('.step').forEach((step, index) => {
                            step.classList.remove('active', 'completed');
                            if (index + 1 === currentStep) {
                                step.classList.add('active');
                            } else if (index + 1 < currentStep) {
                                step.classList.add('completed');
                            }
                        });
                    }
                    
                    function updateStepContent() {
                        const content = document.getElementById('stepContent');
                        switch (currentStep) {
                            case 1:
                                content.innerHTML = getBasicPropertiesHTML();
                                setupBasicPropertiesHandlers();
                                break;
                            case 2:
                                content.innerHTML = getAgentLocationHTML();
                                setupAgentLocationHandlers();
                                break;
                            case 3:
                                content.innerHTML = getToolsSelectionHTML();
                                setupToolsSelectionHandlers();
                                break;
                            case 4:
                                content.innerHTML = getResourcesHTML();
                                setupResourcesHandlers();
                                break;
                            case 5:
                                content.innerHTML = getHookConfigurationHTML();
                                setupHookConfigurationHandlers();
                                break;
                            case 6:
                                content.innerHTML = getSummaryHTML();
                                break;
                        }
                    }
                    
                    function updateNavigation() {
                        const prevBtn = document.getElementById('prevBtn');
                        const nextBtn = document.getElementById('nextBtn');
                        
                        // Previous button state
                        prevBtn.disabled = currentStep === 1;
                        prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-block';
                        
                        // Next/Create button state and text
                        if (currentStep === 5) {
                            nextBtn.textContent = 'Create Agent';
                            nextBtn.className = 'primary create-btn';
                            nextBtn.setAttribute('aria-label', 'Create the agent with current configuration');
                        } else {
                            nextBtn.textContent = 'Next';
                            nextBtn.className = 'primary';
                            nextBtn.setAttribute('aria-label', \`Proceed to step \${currentStep + 1}\`);
                        }
                        
                        // Update button states based on validation
                        updateNavigationStates();
                        
                        // Update step counter
                        updateStepCounter();
                    }
                    
                    function updateNavigationStates() {
                        const nextBtn = document.getElementById('nextBtn');
                        const currentValidation = wizardState?.validation?.[currentStep];
                        
                        // Check if current step is valid
                        const isCurrentStepValid = currentValidation ? currentValidation.isValid : true;
                        
                        // For step 2 (Agent Location), always allow proceeding as it has a default
                        const canProceed = currentStep === 2 || isCurrentStepValid;
                        
                        nextBtn.disabled = !canProceed;
                        
                        // Add loading state support
                        if (nextBtn.classList.contains('loading')) {
                            nextBtn.disabled = true;
                            nextBtn.innerHTML = currentStep === 5 ? 
                                '<span class="spinner"></span> Creating...' : 
                                '<span class="spinner"></span> Validating...';
                        }
                    }
                    
                    function updateStepCounter() {
                        // Add step counter if it doesn't exist
                        let stepCounter = document.getElementById('stepCounter');
                        if (!stepCounter) {
                            stepCounter = document.createElement('div');
                            stepCounter.id = 'stepCounter';
                            stepCounter.className = 'step-counter';
                            document.querySelector('.navigation').appendChild(stepCounter);
                        }
                        
                        stepCounter.textContent = \`Step \${currentStep} of 5\`;
                        stepCounter.setAttribute('aria-live', 'polite');
                    }
                    
                    function setNavigationLoading(isLoading) {
                        const nextBtn = document.getElementById('nextBtn');
                        const prevBtn = document.getElementById('prevBtn');
                        
                        if (isLoading) {
                            nextBtn.classList.add('loading');
                            prevBtn.disabled = true;
                        } else {
                            nextBtn.classList.remove('loading');
                            nextBtn.innerHTML = currentStep === 5 ? 'Create Agent' : 'Next';
                        }
                        
                        updateNavigationStates();
                    }
                    
                    function previousStep() {
                        if (currentStep > 1) {
                            setNavigationLoading(true);
                            
                            vscode.postMessage({
                                type: 'stepChanged',
                                step: currentStep - 1
                            });
                        }
                    }
                    
                    function nextStep() {
                        if (currentStep < 5) {
                            // Validate current step before proceeding
                            setNavigationLoading(true);
                            
                            // Mark that we want to proceed after validation
                            document.getElementById('nextBtn').classList.add('proceed-pending');
                            
                            vscode.postMessage({
                                type: 'validationRequested'
                            });
                            
                            // The actual step change will happen in handleValidation
                        } else {
                            // Final step - create agent
                            setNavigationLoading(true);
                            
                            vscode.postMessage({
                                type: 'wizardCompleted'
                            });
                        }
                    }
                    
                    function proceedToNextStep() {
                        vscode.postMessage({
                            type: 'stepChanged',
                            step: currentStep + 1
                        });
                    }
                    
                    function handleValidation(validation, canProceed) {
                        setNavigationLoading(false);
                        
                        if (currentStep === 1) {
                            displayBasicPropertiesValidation(validation);
                        }
                        
                        // Update next button state
                        updateNavigationStates();
                        
                        // If validation passed and this was triggered by nextStep, proceed
                        if (canProceed && document.getElementById('nextBtn').classList.contains('proceed-pending')) {
                            document.getElementById('nextBtn').classList.remove('proceed-pending');
                            proceedToNextStep();
                        } else if (!canProceed) {
                            // Show validation errors with animation
                            showValidationErrors(validation);
                        }
                    }
                    
                    function showValidationErrors(validation) {
                        // Create or update error summary
                        let errorSummary = document.getElementById('errorSummary');
                        if (!errorSummary) {
                            errorSummary = document.createElement('div');
                            errorSummary.id = 'errorSummary';
                            errorSummary.className = 'error-summary';
                            document.getElementById('stepContent').appendChild(errorSummary);
                        }
                        
                        if (validation.errors && validation.errors.length > 0) {
                            errorSummary.innerHTML = \`
                                <div class="error-icon">\u26A0\uFE0F</div>
                                <div class="error-text">
                                    <strong>Please fix the following issues:</strong>
                                    <ul>
                                        \${validation.errors.map(error => \`<li>\${error}</li>\`).join('')}
                                    </ul>
                                </div>
                            \`;
                            errorSummary.classList.add('show');
                            
                            // Auto-hide after 5 seconds
                            setTimeout(() => {
                                errorSummary.classList.remove('show');
                            }, 5000);
                        } else {
                            errorSummary.classList.remove('show');
                        }
                    }
                    
                    // Basic Properties Step Implementation
                    function getBasicPropertiesHTML() {
                        const data = wizardState?.stepData?.basicProperties || { name: '', description: '', prompt: '' };
                        return \`
                            <div class="form-group">
                                <label class="form-label" for="agentName">
                                    Agent Name <span class="required">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="agentName" 
                                    class="form-input" 
                                    value="\${data.name}"
                                    placeholder="Enter a unique name for your agent"
                                    maxlength="50"
                                />
                                <div class="form-help">
                                    Use letters, numbers, hyphens, and underscores only. This will be used as the filename.
                                </div>
                                <div class="validation-error" id="nameError"></div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="agentDescription">
                                    Description
                                </label>
                                <textarea 
                                    id="agentDescription" 
                                    class="form-input form-textarea" 
                                    placeholder="Brief description of what this agent does (optional)"
                                >\${data.description || ''}</textarea>
                                <div class="form-help">
                                    Optional description to help identify the agent's purpose.
                                </div>
                                <div class="validation-warning" id="descWarning"></div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="agentPrompt">
                                    System Prompt
                                </label>
                                <textarea 
                                    id="agentPrompt" 
                                    class="form-input form-textarea code-style" 
                                    placeholder="Define the agent's behavior, role, and instructions (optional)..."
                                    rows="6"
                                >\${data.prompt || ''}</textarea>
                                <div class="form-help">
                                    Optional high-level context for the agent, similar to a system prompt.
                                </div>
                                <div class="validation-error" id="promptError"></div>
                            </div>
                        \`;
                    }
                    
                    function setupBasicPropertiesHandlers() {
                        const nameInput = document.getElementById('agentName');
                        const descInput = document.getElementById('agentDescription');
                        const promptInput = document.getElementById('agentPrompt');
                        const descCounter = document.getElementById('descCounter');
                        
                        // Real-time validation with debouncing
                        nameInput.addEventListener('input', () => {
                            clearTimeout(validationTimeout);
                            validationTimeout = setTimeout(() => {
                                updateBasicPropertiesData();
                            }, 300);
                        });
                        
                        descInput.addEventListener('input', () => {
                            clearTimeout(validationTimeout);
                            validationTimeout = setTimeout(() => {
                                updateBasicPropertiesData();
                            }, 300);
                        });
                        
                        promptInput.addEventListener('input', () => {
                            clearTimeout(validationTimeout);
                            validationTimeout = setTimeout(() => {
                                updateBasicPropertiesData();
                            }, 300);
                        });
                    }
                    
                    function setupToolsSelectionHandlers() {
                        // Add keyboard navigation for tool cards
                        document.querySelectorAll('.tool-card').forEach(card => {
                            card.setAttribute('tabindex', '0');
                            card.setAttribute('role', 'checkbox');
                            card.setAttribute('aria-checked', card.classList.contains('selected'));
                            
                            card.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    const toolId = card.getAttribute('data-tool-id');
                                    const toolType = card.getAttribute('data-tool-type');
                                    toggleTool(toolId, toolType);
                                }
                            });
                        });
                        
                        // Add keyboard navigation for tabs
                        document.querySelectorAll('.tab-button').forEach(tab => {
                            tab.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    const tabName = tab.getAttribute('data-tab');
                                    switchTab(tabName);
                                }
                            });
                        });
                    }
                    
                    function setupResourcesHandlers() {
                        const dropZone = document.getElementById('dropZone');
                        const fileInput = document.getElementById('fileInput');
                        
                        // Click to browse files
                        dropZone.addEventListener('click', () => {
                            fileInput.click();
                        });
                        
                        // File input change handler
                        fileInput.addEventListener('change', (e) => {
                            const files = Array.from(e.target.files);
                            files.forEach(file => {
                                const path = \`file://\${file.webkitRelativePath || file.name}\`;
                                if (validateResourcePath(path)) {
                                    addResource(path);
                                }
                            });
                            fileInput.value = ''; // Reset input
                        });
                        
                        // Drag and drop handlers
                        dropZone.addEventListener('dragover', (e) => {
                            e.preventDefault();
                            dropZone.classList.add('drag-over');
                        });
                        
                        dropZone.addEventListener('dragleave', (e) => {
                            e.preventDefault();
                            dropZone.classList.remove('drag-over');
                        });
                        
                        dropZone.addEventListener('drop', (e) => {
                            e.preventDefault();
                            dropZone.classList.remove('drag-over');
                            
                            
                            const items = Array.from(e.dataTransfer.items || []);
                            
                            const processedPaths = new Set(); // Track processed paths to avoid duplicates
                            
                            if (items.length > 0) {
                                items.forEach(item => {
                                    
                                    if (item.kind === 'string') {
                                        item.getAsString(text => {
                                            
                                            let paths = [];
                                            
                                            // Try to parse as JSON array first
                                            try {
                                                const parsed = JSON.parse(text);
                                                if (Array.isArray(parsed)) {
                                                    // Extract file paths from objects or use strings directly
                                                    paths = parsed.map(item => {
                                                        if (typeof item === 'string') {
                                                            return item;
                                                        } else if (item && typeof item === 'object') {
                                                            // Handle complex VS Code objects
                                                            if (item.resource && item.resource.fsPath) {
                                                                return item.resource.fsPath;
                                                            } else if (item.resource && item.resource.external) {
                                                                return item.resource.external;
                                                            } else if (item.fsPath) {
                                                                return item.fsPath;
                                                            } else if (item.path) {
                                                                return item.path;
                                                            } else if (item.external) {
                                                                return item.external;
                                                            }
                                                        }
                                                        return null; // Skip invalid items
                                                    }).filter(path => path !== null);
                                                } else if (typeof parsed === 'string') {
                                                    paths = [parsed];
                                                }
                                            } catch {
                                                // If not JSON, split by lines and filter
                                                paths = text.split('\\n').filter(p => p.trim());
                                            }
                                            
                                            paths.forEach(rawPath => {
                                                let path = rawPath.trim();
                                                
                                                // Convert to file:// format if needed
                                                if (!path.startsWith('file://')) {
                                                    path = 'file://' + path;
                                                }
                                                
                                                // Skip if already processed
                                                if (processedPaths.has(path)) {
                                                    return;
                                                }
                                                processedPaths.add(path);
                                                
                                                // Check if it's a directory (no file extension or ends with /)
                                                const isDirectory = path.endsWith('/') || 
                                                    (!path.includes('.') && !path.includes('*'));
                                                
                                                if (isDirectory) {
                                                    // Convert directory to pattern
                                                    path = path.endsWith('/') ? path + '**/*' : path + '/**/*';
                                                }
                                                
                                                if (validateResourcePath(path)) {
                                                    addResource(path);
                                                }
                                            });
                                        });
                                    } else if (item.kind === 'file') {
                                        const file = item.getAsFile();
                                        if (file) {
                                            let path = file.path || file.name;
                                            if (!path.startsWith('file://')) {
                                                path = 'file://' + path;
                                            }
                                            
                                            // Skip if already processed
                                            if (!processedPaths.has(path)) {
                                                processedPaths.add(path);
                                                if (validateResourcePath(path)) {
                                                    addResource(path);
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                        });
                        
                        // Prevent default drag and drop behavior on the entire document except drop zone
                        document.addEventListener('dragover', (e) => {
                            if (!e.target.closest('#dropZone')) {
                                e.preventDefault();
                            }
                        });
                        
                        document.addEventListener('drop', (e) => {
                            if (!e.target.closest('#dropZone')) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        });
                        
                        // Keyboard support for manual input
                        const manualInput = document.getElementById('manualPath');
                        manualInput.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addManualPath();
                            }
                        });
                    }
                    
                    function setupAgentLocationHandlers() {
                        // Add keyboard navigation support
                        document.querySelectorAll('.location-card').forEach(card => {
                            card.setAttribute('tabindex', '0');
                            card.setAttribute('role', 'button');
                            card.setAttribute('aria-pressed', card.classList.contains('selected'));
                            
                            // Keyboard support
                            card.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    const location = card.getAttribute('data-location');
                                    selectLocation(location);
                                }
                            });
                        });
                    }
                    
                    function updateBasicPropertiesData() {
                        const name = document.getElementById('agentName').value;
                        const description = document.getElementById('agentDescription').value;
                        const prompt = document.getElementById('agentPrompt').value;
                        
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                basicProperties: { name, description, prompt }
                            }
                        });
                    }
                    
                    function displayBasicPropertiesValidation(validation) {
                        // Clear all previous errors
                        document.querySelectorAll('.validation-error').forEach(el => el.classList.remove('show'));
                        document.querySelectorAll('.validation-warning').forEach(el => el.classList.remove('show'));
                        
                        // Display errors
                        validation.errors.forEach(error => {
                            if (error.includes('name')) {
                                const errorEl = document.getElementById('nameError');
                                errorEl.textContent = error;
                                errorEl.classList.add('show');
                            } else if (error.includes('prompt') || error.includes('Prompt')) {
                                const errorEl = document.getElementById('promptError');
                                errorEl.textContent = error;
                                errorEl.classList.add('show');
                            }
                        });
                        
                        // Display warnings
                        if (validation.warnings) {
                            validation.warnings.forEach(warning => {
                                if (warning.includes('Description')) {
                                    const warningEl = document.getElementById('descWarning');
                                    warningEl.textContent = warning;
                                    warningEl.classList.add('show');
                                }
                            });
                        }
                    }
                    
                    // Placeholder functions for other steps
                    function getAgentLocationHTML() {
                        const data = wizardState?.stepData?.agentLocation || { location: 'local' };
                        return \`
                            <div class="location-cards">
                                <div class="location-card \${data.location === 'local' ? 'selected' : ''}" 
                                     onclick="selectLocation('local')" 
                                     data-location="local">
                                    <div class="card-icon">\u{1F4BB}</div>
                                    <div class="card-title">Local Agent</div>
                                    <div class="card-description">
                                        Available only in this workspace
                                    </div>
                                    <div class="card-details">
                                        \u2022 Stored in <code>.amazonq/cli-agents/</code><br>
                                        \u2022 Project-specific configuration<br>
                                        \u2022 Can be shared via version control
                                    </div>
                                </div>
                                
                                <div class="location-card \${data.location === 'global' ? 'selected' : ''}" 
                                     onclick="selectLocation('global')" 
                                     data-location="global">
                                    <div class="card-icon">\u{1F30D}</div>
                                    <div class="card-title">Global Agent</div>
                                    <div class="card-description">
                                        Available in all workspaces
                                    </div>
                                    <div class="card-details">
                                        \u2022 Stored in <code>~/.aws/amazonq/cli-agents/</code><br>
                                        \u2022 User-wide configuration<br>
                                        \u2022 Available across all projects
                                    </div>
                                </div>
                            </div>
                        \`;
                    }
                    
                    function selectLocation(location) {
                        // Update visual selection
                        document.querySelectorAll('.location-card').forEach(card => {
                            card.classList.remove('selected');
                            card.setAttribute('aria-pressed', 'false');
                        });
                        
                        const selectedCard = document.querySelector(\`[data-location="\${location}"]\`);
                        selectedCard.classList.add('selected');
                        selectedCard.setAttribute('aria-pressed', 'true');
                        
                        // Update wizard state
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                agentLocation: { location }
                            }
                        });
                    }
                    
                    function getToolsSelectionHTML() {
                        const data = wizardState?.stepData?.toolsSelection || { standardTools: [], experimentalTools: [] };
                        return \`
                            <div class="tools-tabs">
                                <button class="tab-button active" onclick="switchTab('standard')" data-tab="standard">
                                    Standard Tools
                                </button>
                                <button class="tab-button" onclick="switchTab('experimental')" data-tab="experimental">
                                    Experimental Tools
                                    <span class="experimental-badge">BETA</span>
                                </button>
                            </div>
                            
                            <div class="tab-content">
                                <div class="tab-panel active" id="standardTab">
                                    <div class="tools-grid">
                                        \${getStandardToolsHTML(data.standardTools)}
                                    </div>
                                </div>
                                
                                <div class="tab-panel" id="experimentalTab">
                                    <div class="experimental-warning">
                                        <div class="warning-icon">\u26A0\uFE0F</div>
                                        <div class="warning-text">
                                            <strong>Experimental Features</strong><br>
                                            These tools are in active development and may change or be removed at any time.
                                        </div>
                                    </div>
                                    <div class="tools-grid">
                                        \${getExperimentalToolsHTML(data.experimentalTools)}
                                    </div>
                                </div>
                            </div>
                        \`;
                    }
                    
                    function getStandardToolsHTML(selectedTools) {
                        const standardTools = [
                            {
                                id: 'fs_read',
                                name: 'File System Read',
                                description: 'Read files, directories, and images'
                            },
                            {
                                id: 'fs_write', 
                                name: 'File System Write',
                                description: 'Create and edit files'
                            },
                            {
                                id: 'execute_bash',
                                name: 'Execute Bash',
                                description: 'Execute shell commands'
                            },
                            {
                                id: 'use_aws',
                                name: 'AWS CLI',
                                description: 'Make AWS CLI API calls'
                            },
                            {
                                id: 'introspect',
                                name: 'Introspect',
                                description: 'Q CLI capabilities information'
                            }
                        ];
                        
                        return standardTools.map(tool => \`
                            <div class="tool-card \${selectedTools.includes(tool.id) ? 'selected' : ''}" 
                                 data-tool-id="\${tool.id}" 
                                 data-tool-type="standard"
                                 onclick="toggleTool('\${tool.id}', 'standard')">
                                <div class="tool-header">
                                    <div class="tool-checkbox">
                                        <input type="checkbox" \${selectedTools.includes(tool.id) ? 'checked' : ''} 
                                               onchange="event.stopPropagation(); toggleTool('\${tool.id}', 'standard')">
                                    </div>
                                    <div class="tool-info">
                                        <div class="tool-name">\${tool.name}</div>
                                        <div class="tool-description">\${tool.description}</div>
                                    </div>
                                </div>
                            </div>
                        \`).join('');
                    }
                    
                    function getExperimentalToolsHTML(selectedTools) {
                        const experimentalTools = [
                            {
                                id: 'knowledge',
                                name: 'Knowledge Base',
                                description: 'Store and retrieve information across sessions'
                            },
                            {
                                id: 'thinking',
                                name: 'Thinking Process',
                                description: 'Complex reasoning with step-by-step processes'
                            },
                            {
                                id: 'todo_list',
                                name: 'TODO List',
                                description: 'Task management and tracking'
                            }
                        ];
                        
                        return experimentalTools.map(tool => \`
                            <div class="tool-card experimental \${selectedTools.includes(tool.id) ? 'selected' : ''}" 
                                 data-tool-id="\${tool.id}" 
                                 data-tool-type="experimental"
                                 onclick="toggleTool('\${tool.id}', 'experimental')">
                                <div class="tool-header">
                                    <div class="tool-checkbox">
                                        <input type="checkbox" \${selectedTools.includes(tool.id) ? 'checked' : ''} 
                                               onchange="event.stopPropagation(); toggleTool('\${tool.id}', 'experimental')">
                                    </div>
                                    <div class="tool-info">
                                        <div class="tool-name">
                                            \${tool.name}
                                            <span class="experimental-tag">BETA</span>
                                        </div>
                                        <div class="tool-description">\${tool.description}</div>
                                    </div>
                                </div>
                            </div>
                        \`).join('');
                    }
                    
                    function switchTab(tabName) {
                        // Update tab buttons
                        document.querySelectorAll('.tab-button').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        document.querySelector(\`[data-tab="\${tabName}"]\`).classList.add('active');
                        
                        // Update tab panels
                        document.querySelectorAll('.tab-panel').forEach(panel => {
                            panel.classList.remove('active');
                        });
                        document.getElementById(\`\${tabName}Tab\`).classList.add('active');
                    }
                    
                    function toggleTool(toolId, toolType) {
                        const card = document.querySelector(\`[data-tool-id="\${toolId}"]\`);
                        const checkbox = card.querySelector('input[type="checkbox"]');
                        
                        // Toggle selection
                        checkbox.checked = !checkbox.checked;
                        card.classList.toggle('selected');
                        
                        // Update wizard state
                        updateToolsSelection();
                    }
                    
                    function updateToolsSelection() {
                        const standardTools = Array.from(document.querySelectorAll('[data-tool-type="standard"] input:checked'))
                            .map(input => input.closest('[data-tool-id]').dataset.toolId);
                        
                        const experimentalTools = Array.from(document.querySelectorAll('[data-tool-type="experimental"] input:checked'))
                            .map(input => input.closest('[data-tool-id]').dataset.toolId);
                        
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                toolsSelection: { standardTools, experimentalTools }
                            }
                        });
                    }
                    
                    function getResourcesHTML() {
                        const data = wizardState?.stepData?.resources || { resources: [] };
                        return \`
                            <div class="resources-section">
                                <div class="drop-zone" id="dropZone">
                                    <div class="drop-zone-content">
                                        <div class="drop-icon">\u{1F4C1}</div>
                                        <div class="drop-text">
                                            <strong>Drag & drop files here</strong><br>
                                            or click to browse files
                                        </div>
                                        <input type="file" id="fileInput" multiple style="display: none;">
                                    </div>
                                </div>
                                
                                <div class="manual-input-section">
                                    <div class="input-group">
                                        <input type="text" 
                                               id="manualPath" 
                                               class="form-input" 
                                               placeholder=""
                                               onkeypress="handleManualPathKeypress(event)">
                                        <button onclick="addManualPath()" class="add-btn">Add</button>
                                    </div>
                                    <div class="form-help">
                                        Use <code>file://</code> prefix.
                                    </div>
                                </div>
                                
                                <div class="resources-list" id="resourcesList">
                                    \${getResourcesListHTML(data.resources)}
                                </div>
                            </div>
                        \`;
                    }
                    
                    function getResourcesListHTML(resources) {
                        if (resources.length === 0) {
                            return \`
                                <div class="empty-resources">
                                    <div class="empty-icon">\u{1F4C4}</div>
                                    <div class="empty-text">No resources added yet</div>
                                </div>
                            \`;
                        }
                        
                        return \`
                            <div class="resources-header">
                                <h3>Added Resources (\${resources.length})</h3>
                            </div>
                            <div class="resources-grid">
                                \${resources.map((resource, index) => \`
                                    <div class="resource-item" data-index="\${index}">
                                        <div class="resource-icon">
                                            \${resource.includes('/**') ? '\u{1F4C1}' : '\u{1F4C4}'}
                                        </div>
                                        <div class="resource-info">
                                            <div class="resource-path">\${resource}</div>
                                            <div class="resource-type">
                                                \${resource.includes('/**') ? 'Directory pattern' : 'File'}
                                            </div>
                                        </div>
                                        <button class="remove-btn" onclick="removeResource(\${index})" 
                                                aria-label="Remove resource">
                                            \u2715
                                        </button>
                                    </div>
                                \`).join('')}
                            </div>
                        \`;
                    }
                    
                    function getHookConfigurationHTML() {
                        const data = wizardState?.stepData?.hookConfiguration || { hooks: [], skipHooks: false };
                        return \`
                            <div class="hook-configuration-section">
                                <div class="create-hook-section">
                                    <div class="template-card custom large" data-template="custom">
                                        <div class="template-icon">\u2699\uFE0F</div>
                                        <div class="template-info">
                                            <h4>Create Hook</h4>
                                            <p>Create your own custom hook command</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="hook-templates">
                                    <h3>Quick Templates</h3>
                                    <div class="template-grid">
                                        <div class="template-card" data-template="git-status">
                                            <div class="template-icon">\u{1F4CA}</div>
                                            <div class="template-info">
                                                <h4>Git Status</h4>
                                                <p>Show git status with each prompt</p>
                                            </div>
                                        </div>
                                        <div class="template-card" data-template="current-branch">
                                            <div class="template-icon">\u{1F33F}</div>
                                            <div class="template-info">
                                                <h4>Current Branch</h4>
                                                <p>Show current git branch at start</p>
                                            </div>
                                        </div>
                                        <div class="template-card" data-template="project-info">
                                            <div class="template-icon">\u{1F4C1}</div>
                                            <div class="template-info">
                                                <h4>Project Info</h4>
                                                <p>Display project name at conversation start</p>
                                            </div>
                                        </div>
                                        <div class="template-card" data-template="recent-commits">
                                            <div class="template-icon">\u{1F4DD}</div>
                                            <div class="template-info">
                                                <h4>Recent Commits</h4>
                                                <p>Show last 3 git commits</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="hook-list">
                                    <h3>Configured Hooks</h3>
                                    <div id="hooksList">
                                        \${getHooksListHTML(data.hooks)}
                                    </div>
                                </div>
                            </div>
                        \`;
                    }
                    
                    function getHooksListHTML(hooks) {
                        if (hooks.length === 0) {
                            return \`
                                <div class="empty-hooks">
                                    <div class="empty-icon">\u{1FA9D}</div>
                                    <div class="empty-text">No hooks configured yet</div>
                                    <div class="empty-subtext">Select a template above to get started</div>
                                </div>
                            \`;
                        }
                        
                        return \`
                            <div class="hooks-grid">
                                \${hooks.map((hook, index) => \`
                                    <div class="hook-item" data-index="\${index}">
                                        <div class="hook-header">
                                            <div class="hook-name">\${hook.name}</div>
                                            <div class="hook-actions">
                                                <button class="edit-hook-btn" onclick="editHook(\${index})">\u270F\uFE0F</button>
                                                <button class="remove-hook-btn" onclick="removeHook(\${index})">\u{1F5D1}\uFE0F</button>
                                            </div>
                                        </div>
                                        <div class="hook-details">
                                            <div class="hook-trigger">
                                                <span class="trigger-badge \${hook.trigger}">
                                                    \${hook.trigger === 'agentSpawn' ? '\u{1F680} On Start' : '\u{1F4AC} Per Prompt'}
                                                </span>
                                            </div>
                                            <div class="hook-command">\${hook.command}</div>
                                        </div>
                                    </div>
                                \`).join('')}
                            </div>
                        \`;
                    }
                    
                    function addManualPath() {
                        const input = document.getElementById('manualPath');
                        const path = input.value.trim();
                        
                        if (path) {
                            if (validateResourcePath(path)) {
                                addResource(path);
                                input.value = '';
                            }
                        }
                    }
                    
                    function handleManualPathKeypress(event) {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            addManualPath();
                        }
                    }
                    
                    function validateResourcePath(path) {
                        
                        if (!path.startsWith('file://')) {
                            showResourceError('Resource path must start with "file://"');
                            return false;
                        }
                        
                        // Check for invalid characters but exclude common valid characters
                        if (/[<>"|*]/.test(path)) {
                            showResourceError('Resource path contains invalid characters');
                            return false;
                        }
                        
                        // Check for duplicates
                        const currentResources = wizardState?.stepData?.resources?.resources || [];
                        if (currentResources.includes(path)) {
                            showResourceError('This resource has already been added');
                            return false;
                        }
                        
                        // Clear any existing error message on successful validation
                        clearResourceError();
                        return true;
                    }
                    
                    function showResourceError(message) {
                        // Create or update error message
                        let errorEl = document.getElementById('resourceError');
                        if (!errorEl) {
                            errorEl = document.createElement('div');
                            errorEl.id = 'resourceError';
                            errorEl.className = 'resource-error';
                            document.querySelector('.manual-input-section').appendChild(errorEl);
                        }
                        
                        errorEl.textContent = message;
                        errorEl.classList.add('show');
                        
                        setTimeout(() => {
                            errorEl.classList.remove('show');
                        }, 3000);
                    }
                    
                    function clearResourceError() {
                        const errorEl = document.getElementById('resourceError');
                        if (errorEl) {
                            errorEl.classList.remove('show');
                        }
                    }
                    
                    function addResource(path) {
                        const currentResources = wizardState?.stepData?.resources?.resources || [];
                        const newResources = [...currentResources, path];
                        
                        // Update local state
                        if (wizardState?.stepData?.resources) {
                            wizardState.stepData.resources.resources = newResources;
                        }
                        
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                resources: { resources: newResources }
                            }
                        });
                        
                        // Update UI immediately
                        updateUI();
                    }
                    
                    function removeResource(index) {
                        const currentResources = wizardState?.stepData?.resources?.resources || [];
                        const newResources = currentResources.filter((_, i) => i !== index);
                        
                        // Update local state
                        if (wizardState?.stepData?.resources) {
                            wizardState.stepData.resources.resources = newResources;
                        }
                        
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                resources: { resources: newResources }
                            }
                        });
                        
                        // Update UI immediately
                        updateUI();
                    }
                    
                    function getSummaryHTML() {
                        const data = wizardState?.stepData || {};
                        const { basicProperties, agentLocation, toolsSelection, resources, hookConfiguration } = data;
                        
                        return \`
                            <div class="summary-sections">
                                <div class="summary-section">
                                    <div class="summary-header">
                                        <h3>Basic Properties</h3>
                                        <button class="edit-btn" onclick="goToStep(1)">Edit</button>
                                    </div>
                                    <div class="summary-content">
                                        <div class="summary-item">
                                            <span class="summary-label">Name:</span>
                                            <span class="summary-value">\${basicProperties?.name || 'Not set'}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">Description:</span>
                                            <span class="summary-value">\${basicProperties?.description || 'None'}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">Prompt:</span>
                                            <div class="summary-prompt">\${basicProperties?.prompt || 'Not set'}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="summary-section">
                                    <div class="summary-header">
                                        <h3>Agent Location</h3>
                                        <button class="edit-btn" onclick="goToStep(2)">Edit</button>
                                    </div>
                                    <div class="summary-content">
                                        <div class="location-summary">
                                            <div class="location-icon">
                                                \${agentLocation?.location === 'global' ? '\u{1F30D}' : '\u{1F4BB}'}
                                            </div>
                                            <div class="location-info">
                                                <div class="location-name">
                                                    \${agentLocation?.location === 'global' ? 'Global Agent' : 'Local Agent'}
                                                </div>
                                                <div class="location-desc">
                                                    \${agentLocation?.location === 'global' 
                                                        ? 'Available in all workspaces' 
                                                        : 'Available only in this workspace'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="summary-section">
                                    <div class="summary-header">
                                        <h3>Tools</h3>
                                        <button class="edit-btn" onclick="goToStep(3)">Edit</button>
                                    </div>
                                    <div class="summary-content">
                                        \${getToolsSummaryHTML(toolsSelection)}
                                    </div>
                                </div>
                                
                                <div class="summary-section">
                                    <div class="summary-header">
                                        <h3>Resources</h3>
                                        <button class="edit-btn" onclick="goToStep(4)">Edit</button>
                                    </div>
                                    <div class="summary-content">
                                        \${getResourcesSummaryHTML(resources)}
                                    </div>
                                </div>
                                
                                <div class="summary-section">
                                    <div class="summary-header">
                                        <h3>Context Hooks</h3>
                                        <button class="edit-btn" onclick="goToStep(5)">Edit</button>
                                    </div>
                                    <div class="summary-content">
                                        \${getHooksSummaryHTML(hookConfiguration)}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="creation-info">
                                <div class="info-icon">\u2139\uFE0F</div>
                                <div class="info-text">
                                    Your agent will be created as <code>\${basicProperties?.name || 'agent'}.json</code> 
                                    in the \${agentLocation?.location === 'global' ? 'global' : 'local'} agents directory.
                                </div>
                            </div>
                        \`;
                    }
                    
                    function getToolsSummaryHTML(toolsSelection) {
                        const standardTools = toolsSelection?.standardTools || [];
                        const experimentalTools = toolsSelection?.experimentalTools || [];
                        const totalTools = standardTools.length + experimentalTools.length;
                        
                        if (totalTools === 0) {
                            return \`
                                <div class="empty-summary">
                                    <span class="empty-icon">\u{1F527}</span>
                                    <span>No tools selected</span>
                                </div>
                            \`;
                        }
                        
                        return \`
                            <div class="tools-summary">
                                \${standardTools.length > 0 ? \`
                                    <div class="tools-group">
                                        <div class="tools-group-title">Standard Tools (\${standardTools.length})</div>
                                        <div class="tools-list">
                                            \${standardTools.map(tool => \`<span class="tool-tag">\${tool}</span>\`).join('')}
                                        </div>
                                    </div>
                                \` : ''}
                                \${experimentalTools.length > 0 ? \`
                                    <div class="tools-group">
                                        <div class="tools-group-title">
                                            Experimental Tools (\${experimentalTools.length})
                                            <span class="experimental-badge">BETA</span>
                                        </div>
                                        <div class="tools-list">
                                            \${experimentalTools.map(tool => \`<span class="tool-tag experimental">\${tool}</span>\`).join('')}
                                        </div>
                                    </div>
                                \` : ''}
                            </div>
                        \`;
                    }
                    
                    function getResourcesSummaryHTML(resources) {
                        const resourceList = resources?.resources || [];
                        
                        if (resourceList.length === 0) {
                            return \`
                                <div class="empty-summary">
                                    <span class="empty-icon">\u{1F4C4}</span>
                                    <span>No resources added</span>
                                </div>
                            \`;
                        }
                        
                        return \`
                            <div class="resources-summary">
                                <div class="resources-count">\${resourceList.length} resource(s) added</div>
                                <div class="resources-preview">
                                    \${resourceList.map(resource => \`
                                        <div class="resource-preview-item">
                                            <span class="resource-preview-icon">
                                                \${resource.includes('/**') ? '\u{1F4C1}' : '\u{1F4C4}'}
                                            </span>
                                            <span class="resource-preview-path">\${resource}</span>
                                        </div>
                                    \`).join('')}
                                </div>
                            </div>
                        \`;
                    }
                    
                    function getHooksSummaryHTML(hookConfiguration) {
                        if (!hookConfiguration || hookConfiguration.skipHooks) {
                            return \`
                                <div class="empty-summary">
                                    <span class="empty-icon">\u{1FA9D}</span>
                                    <span>Hooks skipped</span>
                                </div>
                            \`;
                        }
                        
                        const hooks = hookConfiguration.hooks || [];
                        
                        if (hooks.length === 0) {
                            return \`
                                <div class="empty-summary">
                                    <span class="empty-icon">\u{1FA9D}</span>
                                    <span>No hooks configured</span>
                                </div>
                            \`;
                        }
                        
                        return \`
                            <div class="hooks-summary">
                                <div class="hooks-count">\${hooks.length} hook(s) configured</div>
                                <div class="hooks-preview">
                                    \${hooks.map(hook => \`
                                        <div class="hook-preview-item">
                                            <span class="hook-preview-trigger \${hook.trigger}">
                                                \${hook.trigger === 'agentSpawn' ? '\u{1F680}' : '\u{1F4AC}'}
                                            </span>
                                            <span class="hook-preview-name">\${hook.name}</span>
                                        </div>
                                    \`).join('')}
                                </div>
                            </div>
                        \`;
                    }
                    
                    function goToStep(stepNumber) {
                        vscode.postMessage({
                            type: 'stepChanged',
                            step: stepNumber
                        });
                    }
                    
                    function setupHookConfigurationHandlers() {
                        // Template card click handlers
                        document.querySelectorAll('.template-card').forEach(card => {
                            card.addEventListener('click', function() {
                                const templateId = this.dataset.template;
                                if (templateId === 'custom') {
                                    showCustomHookDialog();
                                } else {
                                    addTemplateHook(templateId);
                                }
                            });
                        });
                    }
                    
                    function addTemplateHook(templateId) {
                        const templates = {
                            'git-status': {
                                id: Date.now().toString(),
                                name: 'Git Status',
                                trigger: 'userPromptSubmit',
                                command: 'git status --short',
                                isCustom: false,
                                templateId: 'git-status'
                            },
                            'current-branch': {
                                id: Date.now().toString(),
                                name: 'Current Branch',
                                trigger: 'agentSpawn',
                                command: 'git branch --show-current',
                                isCustom: false,
                                templateId: 'current-branch'
                            },
                            'project-info': {
                                id: Date.now().toString(),
                                name: 'Project Info',
                                trigger: 'agentSpawn',
                                command: 'echo "Project: $(basename $(pwd))"',
                                isCustom: false,
                                templateId: 'project-info'
                            },
                            'recent-commits': {
                                id: Date.now().toString(),
                                name: 'Recent Commits',
                                trigger: 'agentSpawn',
                                command: 'git --no-pager log --oneline -3',
                                isCustom: false,
                                templateId: 'recent-commits'
                            }
                        };
                        
                        const template = templates[templateId];
                        if (template) {
                            const currentHooks = wizardState?.stepData?.hookConfiguration?.hooks || [];
                            
                            // Check for duplicates
                            if (currentHooks.some(h => h.templateId === templateId)) {
                                showHookError('This template is already added');
                                return;
                            }
                            
                            const newHooks = [...currentHooks, template];
                            updateHookConfiguration({ hooks: newHooks });
                            refreshHooksList();
                        }
                    }
                    
                    function showCustomHookDialog() {
                        // Create modal dialog for custom hook
                        const modal = document.createElement('div');
                        modal.className = 'hook-modal';
                        modal.innerHTML = \`
                            <div class="hook-modal-content">
                                <div class="hook-modal-header">
                                    <h3>Create Custom Hook</h3>
                                    <button class="close-modal" onclick="closeHookModal()">\u2715</button>
                                </div>
                                <div class="hook-modal-body">
                                    <div class="form-group">
                                        <label for="hookName">Hook Name</label>
                                        <input type="text" id="hookName" placeholder="Enter hook name">
                                    </div>
                                    <div class="form-group">
                                        <label for="hookTrigger">Trigger</label>
                                        <select id="hookTrigger">
                                            <option value="agentSpawn">On conversation start</option>
                                            <option value="userPromptSubmit">With each prompt</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="hookCommand">Command</label>
                                        <textarea id="hookCommand" placeholder="Enter shell command" rows="3"></textarea>
                                    </div>
                                    <div class="hook-validation-messages" id="hookValidation"></div>
                                </div>
                                <div class="hook-modal-footer">
                                    <button class="cancel-btn" onclick="closeHookModal()">Cancel</button>
                                    <button class="save-btn" onclick="saveCustomHook()">Save Hook</button>
                                </div>
                            </div>
                        \`;
                        
                        document.body.appendChild(modal);
                        
                        // Focus on name input
                        setTimeout(() => {
                            document.getElementById('hookName').focus();
                        }, 100);
                    }
                    
                    function closeHookModal() {
                        const modal = document.querySelector('.hook-modal');
                        if (modal) {
                            modal.remove();
                        }
                    }
                    
                    function saveCustomHook() {
                        const name = document.getElementById('hookName').value.trim();
                        const trigger = document.getElementById('hookTrigger').value;
                        const command = document.getElementById('hookCommand').value.trim();
                        
                        if (!name || !command) {
                            showHookValidation(['Hook name and command are required']);
                            return;
                        }
                        
                        const hook = {
                            id: Date.now().toString(),
                            name,
                            trigger,
                            command,
                            isCustom: true
                        };
                        
                        const currentHooks = wizardState?.stepData?.hookConfiguration?.hooks || [];
                        const newHooks = [...currentHooks, hook];
                        
                        updateHookConfiguration({ hooks: newHooks });
                        refreshHooksList();
                        closeHookModal();
                    }
                    
                    function editHook(index) {
                        const hooks = wizardState?.stepData?.hookConfiguration?.hooks || [];
                        const hook = hooks[index];
                        if (!hook) return;
                        
                        // Show edit dialog (similar to custom hook dialog)
                        showCustomHookDialog();
                        
                        // Pre-fill with existing values
                        setTimeout(() => {
                            document.getElementById('hookName').value = hook.name;
                            document.getElementById('hookTrigger').value = hook.trigger;
                            document.getElementById('hookCommand').value = hook.command;
                            
                            // Change save button to update
                            const saveBtn = document.querySelector('.save-btn');
                            saveBtn.textContent = 'Update Hook';
                            saveBtn.onclick = () => updateExistingHook(index);
                        }, 100);
                    }
                    
                    function updateExistingHook(index) {
                        const name = document.getElementById('hookName').value.trim();
                        const trigger = document.getElementById('hookTrigger').value;
                        const command = document.getElementById('hookCommand').value.trim();
                        
                        if (!name || !command) {
                            showHookValidation(['Hook name and command are required']);
                            return;
                        }
                        
                        const hooks = wizardState?.stepData?.hookConfiguration?.hooks || [];
                        hooks[index] = {
                            ...hooks[index],
                            name,
                            trigger,
                            command
                        };
                        
                        updateHookConfiguration({ hooks });
                        refreshHooksList();
                        closeHookModal();
                    }
                    
                    function removeHook(index) {
                        const hooks = wizardState?.stepData?.hookConfiguration?.hooks || [];
                        const newHooks = hooks.filter((_, i) => i !== index);
                        
                        updateHookConfiguration({ hooks: newHooks });
                        refreshHooksList();
                    }
                    
                    function updateHookConfiguration(data) {
                        if (wizardState?.stepData?.hookConfiguration) {
                            Object.assign(wizardState.stepData.hookConfiguration, data);
                        }
                        
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                hookConfiguration: wizardState.stepData.hookConfiguration
                            }
                        });
                    }
                    
                    function refreshHooksList() {
                        const hooksList = document.getElementById('hooksList');
                        if (hooksList) {
                            const hooks = wizardState?.stepData?.hookConfiguration?.hooks || [];
                            hooksList.innerHTML = getHooksListHTML(hooks);
                        }
                    }
                    
                    function showHookError(message) {
                        // Show error message (similar to resource error)
                        console.error('Hook error:', message);
                    }
                    
                    function showHookValidation(errors) {
                        const validationDiv = document.getElementById('hookValidation');
                        if (validationDiv && errors.length > 0) {
                            validationDiv.innerHTML = \`
                                <div class="validation-errors">
                                    \${errors.map(error => \`<div class="error-message">\u26A0\uFE0F \${error}</div>\`).join('')}
                                </div>
                            \`;
                        }
                    }
                    
                    // Initialize
                    updateUI();
                </script>
            </body>
            </html>
        `}dispose(){this.panel?.dispose(),this.disposables.forEach(e=>e.dispose()),this.disposables=[]}}});var Ke={};z(Ke,{AgentTreeProvider:()=>Ce});var E,Ce,Ye=k(()=>{"use strict";E=x(require("vscode"));K();Ce=class{constructor(e,t){this.agentManagementService=e;this.logger=t;this._onDidChangeTreeData=new E.EventEmitter;this.onDidChangeTreeData=this._onDidChangeTreeData.event;this._onAgentSelected=new E.EventEmitter;this.onAgentSelected=this._onAgentSelected.event;this.agentItems=[];this._disposed=!1;this.disposables=[];this.disposables.push(this._onDidChangeTreeData),this.disposables.push(this._onAgentSelected),this.disposables.push(this.agentManagementService.onAgentListChanged(this.onAgentListChanged.bind(this))),this.logger.debug("AgentTreeProvider initialized"),this.initializeAgentList()}static{g(this,"AgentTreeProvider")}async initializeAgentList(){try{let e=await this.agentManagementService.getAgentList();this.updateAgentItems(e)}catch(e){this.logger.error("Failed to initialize agent list",e),this.agentItems=[],this.refresh()}}onAgentListChanged(e){this.logger.debug(`Agent list changed: ${e.length} agents`),this.updateAgentItems(e)}fireAgentSelected(e){if(this._disposed){this.logger.debug("AgentTreeProvider disposed, ignoring selection event");return}this.logger.debug(`Firing agent selection event: ${e.agentName} at ${e.location}`),this._onAgentSelected.fire(e),this.logger.debug(`Agent selection event fired for: ${e.agentName}`)}handleAgentSelection(e){if(this._disposed)return;let t=e.filePath.includes(".aws/amazonq/cli-agents")?"global":"local",o={agentName:e.config.name,agentPath:e.filePath,agentConfig:e.config,location:t,timestamp:Date.now()};this.fireAgentSelected(o)}dispose(){this._disposed||(this._disposed=!0,this.disposables.forEach(e=>{try{e.dispose()}catch(t){this.logger.error("Error disposing AgentTreeProvider resource",t)}}),this.disposables.length=0,this.agentItems=[],this.logger.debug("AgentTreeProvider disposed"))}refresh(){this._disposed||(this.logger.debug("Agent tree view refreshed"),this._onDidChangeTreeData.fire())}getTreeItem(e){if(this._disposed)return new E.TreeItem("Disposed");if(this.isLocationSeparatorItem(e))return this.createTreeItemForLocationSeparator(e);if(this.isCreateAgentItem(e))return this.createTreeItemForCreateButton(e);if(this.isEmptyStateItem(e))return this.createTreeItemForEmptyState(e);let t=e,o=new E.TreeItem(t.label),r=t.config.name||t.label||"unknown";return o.id=`agent-${r}`,t.filePath&&(o.resourceUri=E.Uri.file(t.filePath)),t.description!==void 0&&(o.description=t.description),t.iconPath!==void 0&&(o.iconPath=t.iconPath),t.contextValue!==void 0&&(o.contextValue=t.contextValue),o.collapsibleState=t.collapsibleState||E.TreeItemCollapsibleState.None,o.tooltip=this.createAgentTooltip(t),o}getChildren(e){if(this._disposed)return Promise.resolve([]);if(e){if(this.isLocationSeparatorItem(e)){let t=e;return Promise.resolve(t.children)}else if(!this.isCreateAgentItem(e)&&!this.isEmptyStateItem(e)){let t=e;return Promise.resolve(t.children||[])}}else return Promise.resolve(this.getRootItems());return Promise.resolve([])}getRootItems(){if(this.agentItems.length===0)return[this.createEmptyStateItem()];let e=[],t=[];for(let r of this.agentItems){let i=r,a=i.location||"local";if(i.hasConflict){let n={...i,iconPath:new E.ThemeIcon("warning",new E.ThemeColor("problemsWarningIcon.foreground")),description:`${i.description||""} (Conflict)`.trim()};a==="local"?e.push(n):t.push(n)}else a==="local"?e.push(i):t.push(i)}let o=[];return e.length>0&&o.push(this.createLocationSeparator("Local Agents",e)),t.length>0&&o.push(this.createLocationSeparator("Global Agents",t)),o.length===0?[this.createEmptyStateItem()]:o}createLocationSeparator(e,t){return{label:`${e} (${t.length})`,contextValue:"locationSeparator",collapsibleState:E.TreeItemCollapsibleState.Expanded,children:t}}updateAgentItems(e){this._disposed||(this.logger.debug(`Updating agent tree with ${e.length} items`),this.agentItems=[],e.length>0&&this.agentItems.push(...e),this.refresh())}addAgentItem(e){if(this._disposed)return;this.logger.debug(`Adding agent item: ${e.label}`);let t=this.agentItems.findIndex(o=>o.label===e.label);t>=0?this.agentItems[t]=e:(this.agentItems.push(e),this.agentItems.sort((o,r)=>o.label.localeCompare(r.label))),this.refresh()}removeAgentItem(e){if(this._disposed)return;this.logger.debug(`Removing agent item: ${e.label}`);let t=this.agentItems.findIndex(o=>o.label===e.label);t>=0&&(this.agentItems.splice(t,1),this.refresh())}getAgentItems(){return[...this.agentItems]}createEmptyStateItem(){return{label:"No agents found",description:"Use the + button above to create a new agent",iconPath:new E.ThemeIcon("info"),contextValue:v.CONTEXT_VALUES.EMPTY_STATE}}createTreeItemForCreateButton(e){let t=new E.TreeItem(e.label);return t.description=e.description,t.iconPath=e.iconPath,t.contextValue=e.contextValue,t.collapsibleState=E.TreeItemCollapsibleState.None,t.command=e.command,t.tooltip="Click to create a new Q CLI agent",t}createAgentTooltip(e){let t=new E.MarkdownString;return t.appendMarkdown(`**${e.config.name}**

`),e.config.description&&t.appendMarkdown(`*${e.config.description}*

`),t.appendMarkdown(`**Tools:** ${e.config.tools.length} available

`),t.appendMarkdown(`**Resources:** ${e.config.resources.length} configured

`),t.appendMarkdown(`**File:** \`${e.filePath}\``),t.isTrusted=!0,t}selectAgent(e){if(this._disposed){this.logger.warn("AgentTreeProvider disposed, ignoring selectAgent call");return}this.logger.info(`selectAgent method called for: ${e.config.name}`),this.handleAgentSelection(e),this.logger.info(`handleAgentSelection completed for: ${e.config.name}`)}isLocationSeparatorItem(e){return e.contextValue==="locationSeparator"}isCreateAgentItem(e){return"command"in e&&e.contextValue===v.CONTEXT_VALUES.CREATE_BUTTON}isEmptyStateItem(e){return e.contextValue===v.CONTEXT_VALUES.EMPTY_STATE}createTreeItemForLocationSeparator(e){let t=new E.TreeItem(e.label,e.collapsibleState);return t.contextValue=e.contextValue,t.iconPath=new E.ThemeIcon("folder"),t.tooltip=`${e.children.length} agents in this location`,t}createTreeItemForEmptyState(e){let t=new E.TreeItem(e.label);return t.description=e.description,t.iconPath=e.iconPath,t.contextValue=e.contextValue,t.collapsibleState=E.TreeItemCollapsibleState.None,t.tooltip="No Q CLI agents found. Create your first agent to get started.",t}async forceRefresh(){if(!this._disposed)try{this.logger.debug("Force refreshing agent tree"),await this.agentManagementService.refreshAgentList()}catch(e){this.logger.error("Failed to force refresh agent tree",e),this.agentItems=[],this.refresh()}}}});var Je={};z(Je,{AgentManagementService:()=>Ie});var y,ke,Ie,Qe=k(()=>{"use strict";y=x(require("vscode")),ke=x(require("path"));K();J();Ie=class{constructor(e,t,o){this.disposables=[];this._onAgentListChanged=new y.EventEmitter;this.onAgentListChanged=this._onAgentListChanged.event;this.agentItems=[];this.isWatchingFiles=!1;this.agentConfigService=e,this.logger=t,this.errorHandler=o,this.disposables.push(this._onAgentListChanged),this.logger.debug("AgentManagementService initialized")}static{g(this,"AgentManagementService")}async getAgentList(){try{this.logger.debug("Getting agent list");let e=Date.now(),t=await this.agentConfigService.scanAgentFiles();this.logger.debug(`Found ${t.length} agent files`);let o=[],r=new Set,i=new Set;for(let a of t)try{let n=await this.agentConfigService.readAgentConfig(a);r.has(n.name)&&i.add(n.name),r.add(n.name)}catch{}for(let a of t)try{let n=await this.agentConfigService.readAgentConfig(a),c=this.isAgentRunning(n.name),m=this.determineLocationFromPath(a),l=i.has(n.name),d=this.createAgentItemFromConfig(n,a,c,m,l);o.push(d)}catch(n){this.logger.warn(`Failed to load agent config from ${a}`,n);let c=this.agentConfigService.extractAgentNameFromPath(a),m=this.createInvalidAgentItem(c,a,n);o.push(m)}return o.sort((a,n)=>{let c=a.location||"local",m=n.location||"local";return c!==m?c==="local"?-1:1:a.label.localeCompare(n.label)}),this.agentItems=o,this.logger.logTiming("getAgentList",e),this.logger.debug(`Agent list retrieved with ${o.length} items`),o}catch(e){let t="Failed to get agent list";throw this.logger.error(t,e),await this.errorHandler.handleFileSystemError(e,"scan agent directory",this.agentConfigService.getAgentDirectory()),new Error(`${t}: ${e.message}`)}}async refreshAgentList(){try{this.logger.debug("Refreshing agent list");let e=await this.getAgentList();this._onAgentListChanged.fire(e),this.logger.info(`Agent list refreshed with ${e.length} items`)}catch(e){throw this.logger.error("Failed to refresh agent list",e),await this.errorHandler.showErrorMessage("Unable to refresh agent list. Please try again.",e,["Retry","Check Permissions"]),e}}async createNewAgent(e,t="local"){try{this.logger.logUserAction("createNewAgent",{name:e,location:t});let o=Date.now(),r=this.validateAgentName(e);if(!r.isValid){await this.errorHandler.handleValidationError(r,`Agent name '${e}'`);let l={success:!1,message:`Invalid agent name: ${r.errors.join(", ")}`};return this.logger.warn("Agent creation failed due to invalid name",{name:e,errors:r.errors}),l}let i=this.agentConfigService.createDefaultAgentConfig(e);await this.agentConfigService.writeAgentConfig(e,i,t);let a=t==="local"?this.agentConfigService.getAgentFilePath(e):ke.join(process.env.HOME||"~",".aws","amazonq","cli-agents",`${e}.json`),n=this.isAgentRunning(e),c=this.createAgentItemFromConfig(i,a,n,t,!1);this.agentItems.push(c),this.agentItems.sort((l,d)=>{let p=l.location||"local",f=d.location||"local";return p!==f?p==="local"?-1:1:l.label.localeCompare(d.label)}),this._onAgentListChanged.fire(this.agentItems),await this.errorHandler.showSuccessMessage(`Agent '${e}' created successfully in ${t} location!`,["Open File","Create Another"]);let m={success:!0,message:`Agent '${e}' created successfully in ${t} location`,agentItem:c};return this.logger.logTiming("createNewAgent",o),this.logger.info("Agent created successfully",{name:e,location:t,filePath:a}),m}catch(o){return await this.errorHandler.handleAgentCreationError(o,e),{success:!1,message:`Failed to create agent '${e}': ${o.message}`,error:o}}}validateAgentName(e){return this.agentConfigService.validateAgentName(e)}startFileWatcher(){if(this.isWatchingFiles){this.logger.debug("File watcher already started");return}try{let e=this.agentConfigService.getAgentDirectory(),t=ke.join(e,`*${v.AGENT_FILE_EXTENSION}`);this.logger.debug("Starting file watcher",{pattern:t}),this.fileWatcher=y.workspace.createFileSystemWatcher(new y.RelativePattern(e,`*${v.AGENT_FILE_EXTENSION}`)),this.fileWatcher.onDidCreate(async o=>{this.logger.debug("Agent file created",{path:o.fsPath}),await this.handleFileSystemChange("created",o.fsPath)}),this.fileWatcher.onDidChange(async o=>{this.logger.debug("Agent file changed",{path:o.fsPath}),await this.handleFileSystemChange("changed",o.fsPath)}),this.fileWatcher.onDidDelete(async o=>{this.logger.debug("Agent file deleted",{path:o.fsPath}),await this.handleFileSystemChange("deleted",o.fsPath)}),y.window.onDidOpenTerminal(o=>{this.logger.debug(`Terminal opened: ${o.name}`),o.name.toLowerCase().includes("q cli")&&setTimeout(()=>this.refreshAgentList(),500)}),y.window.onDidCloseTerminal(o=>{this.logger.debug(`Terminal closed: ${o.name}`),o.name.toLowerCase().includes("q cli")&&setTimeout(()=>this.refreshAgentList(),500)}),this.disposables.push(this.fileWatcher),this.isWatchingFiles=!0,this.logger.info("File watcher started successfully",{pattern:t})}catch(e){let t="Failed to start file watcher";throw this.logger.error(t,e),this.errorHandler.handleFileSystemError(e,"start file system watcher",this.agentConfigService.getAgentDirectory()).catch(o=>{this.logger.error("Error showing file watcher error to user",o)}),new Error(`${t}: ${e.message}`)}}stopFileWatcher(){if(!this.isWatchingFiles||!this.fileWatcher){this.logger.debug("File watcher not running");return}try{this.logger.debug("Stopping file watcher"),this.fileWatcher.dispose(),this.fileWatcher=void 0,this.isWatchingFiles=!1,this.logger.info("File watcher stopped successfully")}catch(e){this.logger.error("Error stopping file watcher",e)}}async handleFileSystemChange(e,t){try{if(!this.agentConfigService.isValidAgentFilePath(t)){this.logger.debug("Ignoring non-agent file change",{filePath:t,changeType:e});return}this.logger.debug("Processing file system change",{changeType:e,filePath:t}),await this.debounceRefresh()}catch(o){this.logger.error("Error handling file system change",o)}}async debounceRefresh(){this.refreshTimeout&&clearTimeout(this.refreshTimeout),this.refreshTimeout=setTimeout(async()=>{try{await this.refreshAgentList()}catch(e){this.logger.error("Error during debounced refresh",e)}},500)}isAgentRunning(e){return y.window.terminals.some(r=>{let i=r.name,a=`Q CLI - ${e}`;return i===a})}getAgentIcon(e){return this.isAgentRunning(e)?new y.ThemeIcon("robot",new y.ThemeColor("charts.green")):v.DEFAULT_ICON}createAgentItemFromConfig(e,t,o,r,i){let a=r||this.determineLocationFromPath(t);return{label:e.name,iconPath:o?new y.ThemeIcon("robot",new y.ThemeColor("charts.green")):v.DEFAULT_ICON,contextValue:v.CONTEXT_VALUES.AGENT_ITEM,filePath:t,config:e,collapsibleState:y.TreeItemCollapsibleState.None,command:{command:Be.OPEN_AGENT,title:"Open Agent Configuration",arguments:[{label:e.name,filePath:t,config:e}]},location:a,hasConflict:i||!1}}determineLocationFromPath(e){return e.includes(".aws/amazonq/cli-agents")?"global":"local"}createInvalidAgentItem(e,t,o){return{label:`${e} (Invalid)`,description:`Error: ${o.message}`,iconPath:new y.ThemeIcon("error"),contextValue:"invalidAgentItem",filePath:t,config:{...ge,name:e},collapsibleState:y.TreeItemCollapsibleState.None}}async promptForAgentName(){let e=0,t=3;for(;e<t;){e++;let o=await y.window.showInputBox({prompt:e===1?"Enter a name for the new agent":`Enter a name for the new agent (Attempt ${e}/${t})`,placeHolder:"my-custom-agent",ignoreFocusOut:!0,validateInput:g(async a=>{if(!a||a.trim().length===0)return"Agent name cannot be empty";let n=a.trim(),c=this.validateAgentName(n);if(!c.isValid)return c.errors[0];try{if(await this.agentConfigService.isAgentNameExists(n))return`Agent '${n}' already exists. Please choose a different name.`}catch(m){this.logger.warn("Error checking agent name existence during input validation",m)}},"validateInput")});if(o===void 0){this.logger.debug("Agent name input cancelled by user");return}let r=o.trim(),i=this.validateAgentName(r);if(i.isValid)return r;if(await this.errorHandler.handleValidationError(i,`Agent name '${r}'`),e>=t){await this.errorHandler.showErrorMessage("Maximum attempts reached. Please try again later.",void 0,["Try Again","Cancel"]);return}}}async createNewAgentInteractive(){try{this.logger.logUserAction("createNewAgentInteractive");let e=await this.promptForAgentName();if(!e){this.logger.debug("Agent creation cancelled by user");return}let t=await this.createNewAgent(e);if(t.success&&t.agentItem){let o=await this.errorHandler.showSuccessMessage(`Agent '${e}' created successfully!`,["Open File","Create Another","View in Explorer"]);await this.handlePostCreationAction(o,t.agentItem)}}catch(e){await this.errorHandler.handleAgentCreationError(e)}}async handlePostCreationAction(e,t){try{switch(e){case"Open File":let o=await y.workspace.openTextDocument(t.filePath);await y.window.showTextDocument(o);break;case"Create Another":await this.createNewAgentInteractive();break;case"View in Explorer":await y.commands.executeCommand("revealFileInOS",y.Uri.file(t.filePath));break;default:break}}catch(o){this.logger.error("Error handling post-creation action",o),await this.errorHandler.showErrorMessage("Action completed, but there was an issue with the follow-up action",o)}}async openAgentConfigFile(e){try{if(this.logger.logUserAction("openAgentConfigFile",{agentName:e.label,filePath:e.filePath}),!await this.agentConfigService.fileExists(e.filePath)){let r=new Error(`Agent configuration file not found: ${e.filePath}`);await this.errorHandler.handleFileAccessError(r,e.filePath);return}let o=await y.workspace.openTextDocument(e.filePath);await y.window.showTextDocument(o,{preview:!1,preserveFocus:!1}),this.logger.info("Agent configuration file opened successfully",{agentName:e.label,filePath:e.filePath})}catch(t){let o=`Failed to open agent configuration file for '${e.label}'`;throw this.logger.error(o,t),await this.errorHandler.handleFileAccessError(t,e.filePath),new Error(`${o}: ${t.message}`)}}async deleteAgent(e){try{this.logger.logUserAction("deleteAgent",{agentName:e});let o=(await this.getAgentList()).find(a=>a.label===e||a.name===e);if(!o)throw new Error(`Agent '${e}' not found`);let i=o.location||"local";await this.agentConfigService.deleteAgentConfig(e,i),await this.refreshAgentList(),this.logger.info("Agent deleted successfully",{agentName:e,location:i,filePath:o.filePath})}catch(t){let o=`Failed to delete agent '${e}'`;throw this.logger.error(o,t),await this.errorHandler.handleFileAccessError(t,e),new Error(`${o}: ${t.message}`)}}getAgentStatistics(){let e=this.agentItems.length,t=this.agentItems.filter(r=>r.contextValue==="invalidAgentItem").length,o=e-t;return{total:e,valid:o,invalid:t}}dispose(){this.logger.debug("Disposing AgentManagementService"),this.stopFileWatcher(),this.refreshTimeout&&clearTimeout(this.refreshTimeout),this.disposables.forEach(e=>{try{e.dispose()}catch(t){this.logger.error("Error disposing resource",t)}}),this.disposables.length=0,this.agentItems=[],this.logger.debug("AgentManagementService disposed")}}});var et={};z(et,{ContextTreeProvider:()=>Te});var b,Te,tt=k(()=>{"use strict";b=x(require("vscode"));K();Te=class{constructor(e,t,o){this.contextResourceService=e;this.logger=t;this._onDidChangeTreeData=new b.EventEmitter;this.onDidChangeTreeData=this._onDidChangeTreeData.event;this.state={selectedAgent:null,resourceFiles:[],isLoading:!1,error:null,searchFilter:""};this.agentSelectionSubscription=null;this.resourceWatcher=null;this._disposed=!1;o&&this.subscribeToAgentSelection(o)}static{g(this,"ContextTreeProvider")}subscribeToAgentSelection(e){this.logger.debug("Subscribing to agent selection events"),this.agentSelectionSubscription=e.onAgentSelected(this.handleAgentSelection.bind(this)),this.logger.debug("Agent selection subscription created")}async handleAgentSelection(e){this.logger.debug(`Context view handling agent selection: ${e.agentName}`),this.resourceWatcher&&(this.resourceWatcher.dispose(),this.resourceWatcher=null),this.state.selectedAgent=e.agentConfig,this.state.isLoading=!0,this.state.error=null,this.refresh();try{if(!b.workspace.workspaceFolders||b.workspace.workspaceFolders.length===0)throw new Error("No workspace folder is open. Please open a folder to view resource files.");let t=new Promise((r,i)=>{setTimeout(()=>i(new Error("Resource loading timed out after 10 seconds")),1e4)}),o=await Promise.race([this.contextResourceService.getResourceFiles(e.agentConfig),t]);this.state.resourceFiles=o,this.state.isLoading=!1;try{this.resourceWatcher=this.contextResourceService.watchResourceChanges(e.agentConfig)}catch(r){this.logger.warn("Failed to setup file watchers, auto-refresh disabled",r)}this.refresh(),o.length===0&&e.agentConfig.resources&&e.agentConfig.resources.length>0&&b.window.showInformationMessage(`No files found matching the resource patterns for agent "${e.agentName}". Check if the patterns are correct and files exist.`,"View Agent Config").then(r=>{r==="View Agent Config"&&b.commands.executeCommand("qcli-agents.openAgent",{filePath:e.agentPath})})}catch(t){this.logger.error("Failed to load resource files",t),this.state.isLoading=!1;let o=this.categorizeError(t);this.state.error=o,this.refresh(),this.showErrorWithRecovery(t,e.agentName)}}categorizeError(e){let t=e.message.toLowerCase();return t.includes("no workspace")?"No workspace folder open":t.includes("permission")||t.includes("eacces")?"Permission denied accessing files":t.includes("not found")||t.includes("enoent")?"Resource files not found":t.includes("timeout")?"Resource loading timed out":t.includes("network")||t.includes("fetch")?"Network error loading resources":`Error: ${e.message}`}async showErrorWithRecovery(e,t){let o=e.message.toLowerCase(),r=[],i=`Failed to load resources for agent "${t}"`;switch(o.includes("no workspace")?(i="No workspace folder is open",r=["Open Folder"]):o.includes("permission")?(i="Permission denied accessing resource files",r=["Check Permissions","Retry"]):o.includes("not found")?(i="Resource files not found",r=["View Agent Config","Retry"]):o.includes("timeout")?(i="Resource loading timed out",r=["Retry","View Agent Config"]):r=["Retry","View Logs"],await b.window.showErrorMessage(i,...r)){case"Open Folder":b.commands.executeCommand("vscode.openFolder");break;case"Retry":this.state.selectedAgent&&this.handleAgentSelection({agentName:this.state.selectedAgent.name,agentPath:"",agentConfig:this.state.selectedAgent,location:"local",timestamp:Date.now()});break;case"View Agent Config":b.commands.executeCommand("qcli-agents.refreshTree");break;case"View Logs":b.commands.executeCommand("workbench.action.toggleDevTools");break;case"Check Permissions":b.window.showInformationMessage("Please check that VS Code has permission to read the workspace files and directories.");break}}getTreeItem(e){if(this._disposed)return new b.TreeItem("Disposed");let t=new b.TreeItem(e.label),o=e;if(o.filePath!==void 0&&o.fileType){if(o.contextValue==="patternGroup"){t.description=e.description,t.collapsibleState=b.TreeItemCollapsibleState.None,t.iconPath=o.iconPath,t.contextValue="patternGroup";let r=new b.MarkdownString;return r.appendMarkdown(`**Resource Pattern**

`),r.appendMarkdown(`\`${o.originalPattern}\`

`),r.appendMarkdown(`${e.description}`),t.tooltip=r,t}e.description&&(t.description=e.description),t.tooltip=this.createFileTooltip(o),o.filePath&&(t.resourceUri=b.Uri.file(o.filePath)),o.fileType==="file"&&o.exists&&(t.command={command:"qcli-context.openFile",title:"Open File",arguments:[o]}),t.collapsibleState=b.TreeItemCollapsibleState.None}else e.description&&(t.description=e.description),t.collapsibleState=e.collapsibleState||b.TreeItemCollapsibleState.None;return e.iconPath&&(t.iconPath=e.iconPath),e.contextValue&&(t.contextValue=e.contextValue),t}formatFileSize(e){if(e===0)return"0 B";let t=1024,o=["B","KB","MB","GB"],r=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,r)).toFixed(1))+" "+o[r]}createFileTooltip(e){let t=new b.MarkdownString;if(t.appendMarkdown(`**${e.label}**

`),e.exists){if(t.appendMarkdown(`**Path:** \`${e.relativePath}\`

`),t.appendMarkdown(`**Size:** ${this.formatFileSize(e.size)}

`),e.lastModified>0){let o=new Date(e.lastModified).toLocaleString();t.appendMarkdown(`**Modified:** ${o}

`)}t.appendMarkdown(`**Pattern:** \`${e.originalPattern}\`

`)}else t.appendMarkdown(`**Status:** File not found

`),t.appendMarkdown(`**Expected Path:** \`${e.relativePath}\`

`);return t.isTrusted=!0,t}getChildren(e){return this._disposed?Promise.resolve([]):e?Promise.resolve([]):Promise.resolve(this.getRootItems())}getRootItems(){if(this.state.isLoading)return[this.createLoadingItem()];if(this.state.error)return[this.createErrorItem(this.state.error)];if(!this.state.selectedAgent)return[this.createNoAgentSelectedItem()];if(!this.state.selectedAgent.resources||this.state.selectedAgent.resources.length===0)return[this.createNoResourcesItem()];let e=this.applySearchFilter(this.state.resourceFiles);return e.length===0?[this.createNoMatchingFilesItem()]:e}applySearchFilter(e){if(!this.state.searchFilter)return e;let t=this.state.searchFilter.toLowerCase();return e.filter(o=>{let r=o.label.toLowerCase().includes(t),i=o.relativePath.toLowerCase().includes(t);return r||i})}createLoadingItem(){return{label:"Loading resource files...",iconPath:new b.ThemeIcon("loading~spin"),contextValue:"loading"}}createErrorItem(e){return{label:"Error loading resources",description:e,iconPath:new b.ThemeIcon("error"),contextValue:"error"}}createNoAgentSelectedItem(){return{label:"No agent selected",description:"Select an agent to view its resource files",iconPath:new b.ThemeIcon("info"),contextValue:"noAgentSelected"}}createNoResourcesItem(){return{label:"No resources configured",description:"This agent has no resource files configured",iconPath:new b.ThemeIcon("warning"),contextValue:"noResources"}}createNoMatchingFilesItem(){return{label:"No matching files",description:"No files match the current search filter",iconPath:new b.ThemeIcon("search-stop"),contextValue:"noMatchingFiles"}}setSearchFilter(e){this.state.searchFilter=e,this.refresh()}clearSearchFilter(){this.state.searchFilter="",this.refresh()}refresh(){this._disposed||this._onDidChangeTreeData.fire()}dispose(){this._disposed||(this._disposed=!0,this.agentSelectionSubscription&&this.agentSelectionSubscription.dispose(),this.resourceWatcher&&this.resourceWatcher.dispose(),this._onDidChangeTreeData.dispose(),this.logger.debug("ContextTreeProvider disposed"))}}});var ot={};z(ot,{ContextResourceService:()=>Pe});var w,T,Pe,rt=k(()=>{"use strict";w=x(require("vscode")),T=x(require("path")),Pe=class{constructor(e){this.resourceCache=new Map;this.fileWatchers=new Map;this.CACHE_TTL=300*1e3;this.MAX_CACHE_SIZE=50;this.logger=e,setInterval(()=>this.cleanupExpiredCache(),60*1e3)}static{g(this,"ContextResourceService")}async getResourceFiles(e){if(!e)throw new Error("Agent configuration is required");if(!e.name)throw new Error("Agent name is required");if(!w.workspace.workspaceFolders||w.workspace.workspaceFolders.length===0)throw new Error("No workspace folder is open");let t=this.getCacheKey(e),o=this.resourceCache.get(t);if(o&&Date.now()-o.timestamp<o.ttl)return o.data;let r=[];if(!e.resources||e.resources.length===0)return this.logger.debug(`Agent ${e.name} has no resources configured`),r;let i=e.resources.filter(c=>!c||typeof c!="string"?(this.logger.warn(`Invalid resource pattern: ${c}`),!1):!0);if(i.length===0)throw new Error("No valid resource patterns found");let a=10,n=2;for(let c=0;c<i.length;c+=a){let m=i.slice(c,c+a);for(let l=0;l<=n;l++)try{let d=m.map(async f=>{try{let C=this.normalizeResourcePath(f);if(!C||C.trim()==="")return this.logger.warn(`Empty resource path after normalization: ${f}`),[];let _=await this.findFiles(C);return(await Promise.all(_.map(W=>this.createResourceFileItem(W,f)))).filter(W=>W!==null)}catch(C){return this.logger.warn(`Failed to process resource path: ${f}`,C),[]}}),p=await Promise.all(d);r.push(...p.flat());break}catch(d){if(l===n)throw this.logger.error(`Failed to process batch after ${n} retries`,d),new Error(`Resource processing failed: ${d.message}`);this.logger.warn(`Batch processing failed, retrying (${l+1}/${n})`,d),await new Promise(p=>setTimeout(p,1e3*(l+1)))}}try{let c=this.buildHierarchicalStructure(r),m=this.buildFlatListStructure(r);return this.setCacheEntry(t,m),this.logger.debug(`Loaded ${m.length} resource files for agent ${e.name}`),m}catch(c){throw this.logger.error("Failed to build file structure",c),new Error(`Failed to organize resource files: ${c.message}`)}}buildFlatListStructure(e){let t=new Map;e.forEach(r=>{let i=r.originalPattern;t.has(i)||t.set(i,[]),t.get(i).push(r)});let o=[];for(let[r,i]of t)o.push({label:this.formatPatternLabel(r),filePath:"",relativePath:r,originalPattern:r,fileType:"directory",size:0,lastModified:0,exists:!0,iconPath:new w.ThemeIcon("folder",new w.ThemeColor("charts.blue")),contextValue:"patternGroup",description:`${i.length} file${i.length!==1?"s":""}`}),i.sort((n,c)=>n.label.localeCompare(c.label)).forEach(n=>{o.push({...n,label:`  ${n.label}`,description:n.exists?n.relativePath:`${n.relativePath} (missing)`,children:void 0,contextValue:n.exists?n.fileType==="file"?"resourceFile":"resourceDirectory":"missingResourceFile"})});return o}formatPatternLabel(e){return e.startsWith("file://")?e.substring(7):e}formatFileSize(e){if(e===0)return"0 B";let t=1024,o=["B","KB","MB","GB"],r=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,r)).toFixed(1))+" "+o[r]}watchResourceChanges(e){let t=this.getCacheKey(e),o=[];this.disposeWatchers(t);for(let r of e.resources||[])try{let i=this.normalizeResourcePath(r),a=new w.RelativePattern(w.workspace.workspaceFolders[0],i),n=w.workspace.createFileSystemWatcher(a),c=g(()=>{this.invalidateCache(t),this.logger.debug(`Cache invalidated for: ${t}`)},"invalidateHandler");n.onDidCreate(c),n.onDidDelete(c),n.onDidChange(c),o.push(n)}catch(i){this.logger.warn(`Failed to create watcher for resource: ${r}`,i)}return this.fileWatchers.set(t,o),new w.Disposable(()=>{this.disposeWatchers(t)})}setCacheEntry(e,t){if(this.resourceCache.size>=this.MAX_CACHE_SIZE){let o=this.resourceCache.keys().next().value;this.resourceCache.delete(o)}this.resourceCache.set(e,{data:t,timestamp:Date.now(),ttl:this.CACHE_TTL})}cleanupExpiredCache(){let e=Date.now();for(let[t,o]of this.resourceCache.entries())e-o.timestamp>o.ttl&&(this.resourceCache.delete(t),this.logger.debug(`Expired cache entry removed: ${t}`))}disposeWatchers(e){let t=this.fileWatchers.get(e);t&&(t.forEach(o=>o.dispose()),this.fileWatchers.delete(e))}invalidateCache(e){this.resourceCache.delete(e)}normalizeResourcePath(e){return e.startsWith("file://")?e.substring(7):e}async findFiles(e){try{let t=new w.RelativePattern(w.workspace.workspaceFolders[0],e);return(await w.workspace.findFiles(t,null,1e3)).map(r=>r.fsPath)}catch(t){return this.logger.error(`Failed to find files with pattern: ${e}`,t),[]}}async createResourceFileItem(e,t){try{let o=await w.workspace.fs.stat(w.Uri.file(e)),r=w.workspace.asRelativePath(e);return{label:T.basename(e),filePath:e,relativePath:r,originalPattern:t,fileType:o.type===w.FileType.Directory?"directory":"file",size:o.size,lastModified:o.mtime,exists:!0,iconPath:this.getFileIcon(e,o.type),contextValue:o.type===w.FileType.Directory?"resourceDirectory":"resourceFile"}}catch{return{label:T.basename(e),filePath:e,relativePath:w.workspace.asRelativePath(e),originalPattern:t,fileType:"file",size:0,lastModified:0,exists:!1,iconPath:new w.ThemeIcon("warning"),contextValue:"missingResourceFile"}}}buildHierarchicalStructure(e){let t=new Map,o=[],r=new Set;for(let i of e)this.ensureDirectoryPath(i.filePath,i.originalPattern,t,r);for(let i of e){let a=T.dirname(i.filePath);if(t.has(a)){let n=t.get(a);n.children=n.children||[],n.children.push(i)}else o.push(i)}for(let[i,a]of t){let n=T.dirname(i);if(t.has(n)&&n!==i){let c=t.get(n);c.children=c.children||[],c.children.push(a)}else o.push(a)}return this.handleEmptyDirectories(t),this.sortHierarchicalItems(o)}ensureDirectoryPath(e,t,o,r){let i=T.dirname(e);if(r.has(i)||o.has(i))return;T.dirname(i)!==i&&this.ensureDirectoryPath(i,t,o,r);let n={label:T.basename(i)||i,filePath:i,relativePath:w.workspace.asRelativePath(i),originalPattern:t,fileType:"directory",size:0,lastModified:Date.now(),exists:!0,children:[],iconPath:new w.ThemeIcon("folder"),contextValue:"resourceDirectory"};o.set(i,n),r.add(i)}handleEmptyDirectories(e){for(let[t,o]of e)if(!o.children||o.children.length===0){let r={label:"(empty directory)",filePath:T.join(t,".empty"),relativePath:w.workspace.asRelativePath(T.join(t,".empty")),originalPattern:o.originalPattern,fileType:"file",size:0,lastModified:0,exists:!1,iconPath:new w.ThemeIcon("info",new w.ThemeColor("descriptionForeground")),contextValue:"emptyDirectory"};o.children=[r]}}sortHierarchicalItems(e){return e.sort((t,o)=>t.fileType==="directory"&&o.fileType==="file"?-1:t.fileType==="file"&&o.fileType==="directory"||t.contextValue==="emptyDirectory"||o.contextValue==="emptyDirectory"?1:t.label.localeCompare(o.label,void 0,{numeric:!0,sensitivity:"base"})).map(t=>(t.children&&t.children.length>0&&(t.children=this.sortHierarchicalItems(t.children)),t))}getFileIcon(e,t){if(t===w.FileType.Directory)return new w.ThemeIcon("folder");let o=T.extname(e).toLowerCase(),r={".js":"symbol-method",".ts":"symbol-method",".json":"symbol-property",".md":"markdown",".txt":"symbol-text"};return new w.ThemeIcon(r[o]||"symbol-file")}getCacheKey(e){return`${e.name}-${JSON.stringify(e.resources)}`}}});var at={};z(at,{ContextResourceCommands:()=>Le});var A,it,Le,nt=k(()=>{"use strict";A=x(require("vscode")),it=x(require("path")),Le=class{constructor(e){this.logger=e}static{g(this,"ContextResourceCommands")}async openFile(e){if(!e.exists){A.window.showWarningMessage(`File not found: ${e.relativePath}`);return}try{if(this.isBinaryFile(e.filePath)&&await A.window.showWarningMessage(`"${e.label}" appears to be a binary file. Do you want to open it anyway?`,"Open","Cancel")!=="Open")return;let t=await A.workspace.openTextDocument(e.filePath);await A.window.showTextDocument(t),this.logger.debug(`Opened file: ${e.filePath}`)}catch(t){this.logger.error("Failed to open file",t),A.window.showErrorMessage(`Failed to open file: ${t.message}`)}}async revealInExplorer(e){try{await A.commands.executeCommand("revealFileInOS",A.Uri.file(e.filePath)),this.logger.debug(`Revealed in explorer: ${e.filePath}`)}catch(t){this.logger.error("Failed to reveal file in explorer",t),A.window.showErrorMessage("Failed to reveal file in explorer")}}async copyPath(e){try{await A.env.clipboard.writeText(e.filePath),A.window.showInformationMessage("File path copied to clipboard"),this.logger.debug(`Copied path: ${e.filePath}`)}catch(t){this.logger.error("Failed to copy path",t),A.window.showErrorMessage("Failed to copy file path")}}async copyRelativePath(e){try{await A.env.clipboard.writeText(e.relativePath),A.window.showInformationMessage("Relative path copied to clipboard"),this.logger.debug(`Copied relative path: ${e.relativePath}`)}catch(t){this.logger.error("Failed to copy relative path",t),A.window.showErrorMessage("Failed to copy relative path")}}async searchFiles(e){let t=await A.window.showInputBox({prompt:"Search resource files",placeHolder:"Enter search term (file name or path)",validateInput:g(o=>o&&o.length<2?"Search term must be at least 2 characters":null,"validateInput")});t!==void 0&&(t.trim()===""?(e.clearSearchFilter(),A.window.showInformationMessage("Search filter cleared")):(e.setSearchFilter(t.trim()),A.window.showInformationMessage(`Searching for: "${t}"`)))}isBinaryFile(e){let t=it.extname(e).toLowerCase();return[".exe",".dll",".so",".dylib",".bin",".dat",".jpg",".jpeg",".png",".gif",".bmp",".ico",".mp3",".mp4",".avi",".mov",".wav",".zip",".tar",".gz",".rar",".7z",".pdf",".doc",".docx",".xls",".xlsx",".ppt",".pptx"].includes(t)}}});var It={};z(It,{activate:()=>vt,deactivate:()=>wt,getExtensionState:()=>oe,isExtensionFullyInitialized:()=>kt});module.exports=ht(It);var h=x(require("vscode"));var G=(r=>(r[r.DEBUG=0]="DEBUG",r[r.INFO=1]="INFO",r[r.WARN=2]="WARN",r[r.ERROR=3]="ERROR",r))(G||{}),Ne={EXTENSION_ID:"qcli-context-manager",OUTPUT_CHANNEL_NAME:"Agent Manager for Q CLI",COMMAND_PREFIX:"qcli-context",VIEW_CONTAINER_ID:"qcli-context-view",TREE_VIEW_ID:"qcli-context-tree",MAX_ACTIVATION_TIME:100},Pt={OPEN_CONTEXT_MANAGER:`${Ne.COMMAND_PREFIX}.openAgentManager`,REFRESH_CONTEXT:`${Ne.COMMAND_PREFIX}.refreshContext`};var te=class{static{g(this,"ExtensionLogger")}constructor(e,t=1,o=!1,r=!0,i=!1){this.outputChannel=e,this.logLevel=t,this.debugMode=o,this.showOutputOnError=r,this.logToConsole=i}setLogLevel(e){this.logLevel=e,this.debug(`Log level changed to: ${G[e]}`)}getLogLevel(){return this.logLevel}setDebugMode(e){this.debugMode=e,this.info(`Debug mode ${e?"enabled":"disabled"}`)}isDebugMode(){return this.debugMode}debug(e,...t){(this.debugMode||this.logLevel<=0)&&this.log("DEBUG",e,...t)}info(e,...t){this.logLevel<=1&&this.log("INFO",e,...t)}warn(e,...t){this.logLevel<=2&&this.log("WARN",e,...t)}error(e,t){if(this.logLevel<=3){let o=t?`
Error: ${t.message}
Stack: ${t.stack}`:"";this.log("ERROR",`${e}${o}`),this.showOutputOnError&&this.show()}}log(e,t,...o){let i=`[${new Date().toISOString().slice(0,19).replace("T"," ")}] [${e}] ${t}`;if(o.length>0){let n=o.map(c=>{if(typeof c=="object"&&c!==null)try{return JSON.stringify(c)}catch{return String(c)}return String(c)}).join(" ");i+=` ${n}`}if(this.outputChannel.appendLine(i),this.logToConsole||this.debugMode||e==="ERROR"||e==="WARN")switch(e){case"ERROR":break;case"WARN":break;default:break}}show(){this.outputChannel.show()}clear(){this.outputChannel.clear(),this.info("Output channel cleared")}logTiming(e,t,o){let i=(o||Date.now())-t;this.debug(`Performance: ${e} completed in ${i}ms`)}logLifecycle(e,t){t?this.info(`Lifecycle: ${e}`,t):this.info(`Lifecycle: ${e}`)}logUserAction(e,t){this.debugMode&&(t?this.debug(`User Action: ${e}`,t):this.debug(`User Action: ${e}`))}logCompatibility(e,t){let o=`[COMPATIBILITY] ${e}`;t?this.info(o,t):this.info(o)}updateConfiguration(e){e.showOutputOnError!==void 0&&(this.showOutputOnError=e.showOutputOnError,this.debug(`Show output on error: ${e.showOutputOnError}`)),e.logToConsole!==void 0&&(this.logToConsole=e.logToConsole,this.debug(`Log to console: ${e.logToConsole}`))}};var j=class s{constructor(){this.activationStartTime=0;this.metrics=[];this.maxMetricsHistory=10}static{g(this,"PerformanceMonitor")}static getInstance(){return s.instance||(s.instance=new s),s.instance}startActivationTracking(){this.activationStartTime=Date.now()}endActivationTracking(){let e=Date.now()-this.activationStartTime,t=process.memoryUsage(),o={activationTime:e,memoryUsage:t,timestamp:Date.now()};this.metrics.push(o),this.metrics.length>this.maxMetricsHistory&&this.metrics.shift();let r=oe();return r?.logger&&(r.logger.logLifecycle("Performance metrics recorded",{activationTime:`${e}ms`,memoryUsed:`${Math.round(t.heapUsed/1024/1024)}MB`,memoryTotal:`${Math.round(t.heapTotal/1024/1024)}MB`}),e>100&&r.logger.warn(`Extension activation took ${e}ms, exceeding 100ms target`)),o}getCurrentMemoryUsage(){return process.memoryUsage()}getMetricsHistory(){return[...this.metrics]}getAverageActivationTime(){return this.metrics.length===0?0:this.metrics.reduce((t,o)=>t+o.activationTime,0)/this.metrics.length}checkPerformanceRequirements(){let e=this.getCurrentMemoryUsage(),o=this.metrics[this.metrics.length-1]?.activationTime||0,r=Math.round(e.heapUsed/1024/1024),i=100,a=50;return{activationTimeOk:o<=i,memoryUsageOk:r<=a,details:{activationTime:o,memoryUsageMB:r,activationTimeTarget:i,memoryUsageTargetMB:a}}}forceGarbageCollection(){global.gc}clearMetricsHistory(){this.metrics.length=0;let e=oe();e?.logger&&e.logger.debug("Performance metrics history cleared")}dispose(){this.clearMetricsHistory(),s.instance=void 0}};me();he();var $e=x(require("vscode")),fe=x(require("https"));var ie=class{static{g(this,"PromptZService")}getConfig(){let e=$e.workspace.getConfiguration("qcli-agents.promptz"),t=e.get("apiUrl")||"",o=e.get("apiKey")||"";if(!t||!o)throw new Error("PromptZ API URL and API Key must be configured in VS Code settings. Go to Settings > Extensions > Agent Manager for Q CLI > PromptZ");try{new URL(t)}catch{throw new Error("Invalid PromptZ API URL format. Please check your configuration.")}return{apiUrl:t,apiKey:o}}async getPrompts(){try{this.getConfig()}catch(t){throw t}return(await this.getPromptList()).map(t=>({id:t.id,name:t.name,content:`This is a placeholder prompt for ${t.name}. You can customize this content after creating the agent.`}))}async getAllItems(){try{this.getConfig()}catch(r){throw r}let[e,t,o]=await Promise.all([this.getPromptList(),this.getRuleList(),this.getAgentList()]);return[...e.map(r=>({...r,type:"prompt",content:r.description})),...t.map(r=>({...r,type:"rule",content:r.description})),...o.map(r=>({...r,type:"agent",content:r.description}))]}async getPromptList(){return this.makeGraphQLRequest(`
      query {
        searchPrompts {
          results {
            id
            name
            description
            slug
          }
        }
      }
    `,"searchPrompts")}async getRuleList(){return this.makeGraphQLRequest(`
      query {
        searchProjectRules {
          results {
            id
            name
            description
            slug
          }
        }
      }
    `,"searchProjectRules")}async getAgentList(){return this.makeGraphQLRequest(`
      query {
        searchAgents {
          results {
            id
            name
            description
            slug
          }
        }
      }
    `,"searchAgents")}async getFullContent(e,t){let o,r,i;switch(t){case"prompt":o=`
          query ListPromptBySlug($slug: String!) {
            listPromptBySlug(slug: $slug) {
              items {
                content
              }
            }
          }
        `,r="listPromptBySlug",i="content";break;case"rule":o=`
          query ListProjectRuleBySlug($slug: String!) {
            listProjectRuleBySlug(slug: $slug) {
              items {
                content
              }
            }
          }
        `,r="listProjectRuleBySlug",i="content";break;case"agent":o=`
          query ListAgentBySlug($slug: String!) {
            listAgentBySlug(slug: $slug) {
              items {
                id
                name
                description
                prompt
                tools
                resources
                allowedTools
                mcpServers
                hooks
                toolsSettings
                toolAliases
                useLegacyMcpJson
                scope
                owner
                createdAt
                updatedAt
              }
            }
          }
        `,r="listAgentBySlug",i="prompt";break;default:throw new Error(`Unknown type: ${t}`)}let a=await this.makeGraphQLRequestWithVariables(o,{slug:e},r);if(t==="agent"){let n=a?.items?.[0];if(n)return JSON.stringify(n,null,2)}return a?.items?.[0]?.[i]||""}async makeGraphQLRequestWithVariables(e,t,o){let{apiUrl:r,apiKey:i}=this.getConfig();return new Promise((a,n)=>{let c=JSON.stringify({query:e,variables:t}),m;try{m=new URL(r)}catch{n(new Error(`Invalid API URL: ${r}`));return}let l={hostname:m.hostname,port:m.port||443,path:m.pathname,method:"POST",headers:{"Content-Type":"application/json",Authorization:i,"x-api-key":i,"Content-Length":Buffer.byteLength(c)},timeout:1e4},d=fe.request(l,p=>{let f="";p.on("data",C=>f+=C),p.on("end",()=>{try{if(p.statusCode&&p.statusCode>=400){n(new Error(`HTTP ${p.statusCode}: ${p.statusMessage||"Request failed"}`));return}let C=JSON.parse(f);C.errors?n(new Error(`GraphQL error: ${C.errors[0].message}`)):a(C.data?.[o])}catch{n(new Error(`Invalid JSON response: ${f.substring(0,200)}...`))}})});d.on("error",p=>{p.message.includes("ENOTFOUND")?n(new Error(`Cannot connect to PromptZ API: ${m.hostname} not found`)):n(new Error(`Network error: ${p.message}`))}),d.on("timeout",()=>{d.destroy(),n(new Error("Request timeout"))}),d.write(c),d.end()})}async makeGraphQLRequest(e,t){let{apiUrl:o,apiKey:r}=this.getConfig();return new Promise((i,a)=>{let n=JSON.stringify({query:e}),c;try{c=new URL(o)}catch{a(new Error(`Invalid API URL: ${o}`));return}let m={hostname:c.hostname,port:c.port||443,path:c.pathname,method:"POST",headers:{"Content-Type":"application/json",Authorization:r,"x-api-key":r,"Content-Length":Buffer.byteLength(n)},timeout:1e4},l=fe.request(m,d=>{let p="";d.on("data",f=>p+=f),d.on("end",()=>{try{if(d.statusCode&&d.statusCode>=400){a(new Error(`HTTP ${d.statusCode}: ${d.statusMessage||"Request failed"}`));return}let f=JSON.parse(p);if(f.errors)a(new Error(`GraphQL error: ${f.errors[0].message}`));else{let C=t.split("."),_=f.data;for(let ee of C)_=_?.[ee];i(_?.results||[])}}catch{a(new Error(`Invalid JSON response: ${p.substring(0,200)}...`))}})});l.on("error",d=>{d.message.includes("ENOTFOUND")?a(new Error(`Cannot connect to PromptZ API: ${c.hostname} not found`)):a(new Error(`Network error: ${d.message}`))}),l.on("timeout",()=>{l.destroy(),a(new Error("Request timeout"))}),l.write(n),l.end()})}async testConnection(){try{return await this.getPrompts(),!0}catch{return!1}}};var S=x(require("vscode")),ve=x(require("path")),ne=x(require("fs/promises"));var ae=class{constructor(e,t){this.promptzService=e;this.agentConfigService=t}static{g(this,"PromptZSyncCommand")}async execute(){try{let e=await S.window.withProgress({location:S.ProgressLocation.Notification,title:"Fetching items from PromptZ...",cancellable:!0},async(a,n)=>{if(n.isCancellationRequested)throw new Error("Operation cancelled by user");a.report({increment:30,message:"Connecting to PromptZ..."});let c=await this.promptzService.getAllItems();return a.report({increment:70,message:"Processing items..."}),c});if(e.length===0){S.window.showInformationMessage("No items found in PromptZ. Make sure you have prompts, rules, or agents in your PromptZ account.");return}let t=await S.window.showQuickPick(e.map(a=>({label:`${this.getTypeIcon(a.type)} ${a.name}`,description:`${a.type.toUpperCase()} - ${a.id}`,detail:a.content.substring(0,100)+(a.content.length>100?"...":""),item:a})),{placeHolder:"Select an item to create an agent from",matchOnDescription:!0,matchOnDetail:!0,ignoreFocusOut:!0});if(!t)return;await S.window.withProgress({location:S.ProgressLocation.Notification,title:`Creating ${t.item.type} "${t.item.name}"...`,cancellable:!1},async()=>{await this.createAgentFromItem(t.item)});let o=t.item.type,r=o==="agent"?"agent":"rule",i=o==="agent"?"JSON":"Markdown";S.window.showInformationMessage(`${o.charAt(0).toUpperCase()+o.slice(1)} "${t.item.name}" created successfully as ${i} ${r}!`),S.commands.executeCommand("qcli-agents.refreshTree")}catch(e){if(e instanceof Error){if(e.message.includes("configuration missing")||e.message.includes("must be configured")||e.message.includes("API URL and API Key")){let t=await S.window.showErrorMessage("PromptZ is not configured. Please set your API URL and API Key in VS Code settings. Get them from https://promptz.dev/mcp","Open Settings","Learn More");t==="Open Settings"?S.commands.executeCommand("workbench.action.openSettings","qcli-agents.promptz"):t==="Learn More"&&S.env.openExternal(S.Uri.parse("https://promptz.dev/mcp"));return}if(e.message.includes("Network")||e.message.includes("ENOTFOUND")||e.message.includes("timeout")||e.message.includes("Cannot connect")){S.window.showErrorMessage(`Failed to connect to PromptZ: ${e.message}. Please check your network connection and API configuration.`);return}if(e.message.includes("HTTP")||e.message.includes("GraphQL")||e.message.includes("Invalid JSON")){S.window.showErrorMessage(`PromptZ API error: ${e.message}. Please check your API key and try again.`);return}}S.window.showErrorMessage(`PromptZ sync failed: ${e instanceof Error?e.message:"Unknown error"}`)}}getTypeIcon(e){switch(e){case"prompt":return"\u{1F4AC}";case"rule":return"\u{1F4CB}";case"agent":return"\u{1F916}";default:return"\u{1F4C4}"}}async createAgentFromItem(e){let t=e.name.toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-");if(e.type==="agent"){let o=await this.promptzService.getFullContent(e.slug||e.id,e.type),r;try{r=JSON.parse(o)}catch{r={prompt:o||e.content}}let i=this.agentConfigService.createAgentConfigFromTemplate(t,{description:`Synced from PromptZ ${e.type}: ${e.name}`,prompt:r.prompt||o||e.content||null,additionalTools:Array.isArray(r.tools)?r.tools:["fs_read","fs_write","execute_bash"],additionalResources:Array.isArray(r.resources)?r.resources:[]});if(Array.isArray(r.allowedTools)&&(i.allowedTools=r.allowedTools),r.mcpServers)try{let a=typeof r.mcpServers=="string"?JSON.parse(r.mcpServers):r.mcpServers;i.mcpServers=a}catch{}if(r.hooks)try{let a=typeof r.hooks=="string"?JSON.parse(r.hooks):r.hooks;i.hooks=a}catch{}if(r.toolsSettings)try{let a=typeof r.toolsSettings=="string"?JSON.parse(r.toolsSettings):r.toolsSettings;i.toolsSettings=a}catch{}if(r.toolAliases)try{let a=typeof r.toolAliases=="string"?JSON.parse(r.toolAliases):r.toolAliases;i.toolAliases=a}catch{}typeof r.useLegacyMcpJson=="boolean"&&(i.useLegacyMcpJson=r.useLegacyMcpJson),await this.agentConfigService.writeAgentConfig(i.name,i,!1)}else{let r=await this.promptzService.getFullContent(e.slug||e.id,e.type)||e.content||`${e.type}: ${e.name}`;await this.createMarkdownRule({...e,content:r},t)}}async createMarkdownRule(e,t){let o=S.workspace.workspaceFolders;if(!o||o.length===0)throw new Error("No workspace found. Please open a workspace to sync prompts and rules.");let r=o[0].uri.fsPath,i=ve.join(r,".amazonq","rules");await ne.mkdir(i,{recursive:!0});let a=ve.join(i,`${t}.md`),n=`# ${e.name}

**Type:** ${e.type.charAt(0).toUpperCase()+e.type.slice(1)}  
**Source:** PromptZ  
**ID:** ${e.id}  
**Synced:** ${new Date().toISOString()}

## Content

${e.content}

---
*This file was automatically synced from PromptZ*
`;await ne.writeFile(a,n,"utf-8")}};var u,ze,U,I;async function vt(s){let e=j.getInstance();e.startActivationTracking();let t=Date.now();try{ze=new re({enableFallbacks:!0,logCompatibilityIssues:Q(),strictMode:!1}),U=ze.createSafeContext(s);let o=ze.getIDEInfo(),r=h.window.createOutputChannel("Agent Manager for Q CLI"),i=new te(r,st(),Q(),ct(),lt());if(I=new Z(i),i.logLifecycle(`Extension activation started on ${o.type} IDE`),o.knownLimitations.length>0&&i.logCompatibility(`Known limitations for ${o.type}: ${o.knownLimitations.join(", ")}`),u={isActivated:!1,contextItems:[],outputChannel:r,logger:i,extensionContext:s,debugMode:Q()},s.subscriptions.push(r),U)bt(U,i),yt(U,i);else throw new Error("Failed to create safe extension context");u.isActivated=!0;let a=e.endActivationTracking();i.logLifecycle("Extension core activation completed",{activationTime:`${a.activationTime}ms`,memoryUsed:`${Math.round(a.memoryUsage.heapUsed/1024/1024)}MB`});let n=e.checkPerformanceRequirements();n.activationTimeOk||i.warn(`Activation time (${n.details.activationTime}ms) exceeds target (${n.details.activationTimeTarget}ms)`),setImmediate(()=>{xt(s,i,t)})}catch(o){let r=o;if(I&&U)I.handleActivationError(r,U);else{let i=`Failed to activate Agent Manager for Q CLI extension: ${r.message}`;throw u?.logger&&u.logger.error(i,r),h.window.showErrorMessage("Agent Manager for Q CLI extension failed to activate. Check the output panel for details.","Show Output").then(a=>{a==="Show Output"&&u?.outputChannel&&u.outputChannel.show()}),r}}}g(vt,"activate");function wt(){u?.logger&&u.logger.logLifecycle("Extension deactivation started"),u&&(u.isActivated=!1,u.contextItems=[],u.contextTreeProvider&&typeof u.contextTreeProvider.dispose=="function"&&u.contextTreeProvider.dispose(),u.agentTreeProvider&&typeof u.agentTreeProvider.dispose=="function"&&u.agentTreeProvider.dispose(),u.contextResourceService&&typeof u.contextResourceService.dispose=="function"&&u.contextResourceService.dispose(),Ct(),u.logger.logLifecycle("Extension deactivation completed")),j.getInstance().dispose(),u=void 0,global.gc}g(wt,"deactivate");function bt(s,e){try{let t=h.commands.registerCommand("qcli-agent.openAgentManager",async()=>{try{e.logUserAction("Focus Agent Manager for Q CLI command executed"),await h.commands.executeCommand("qcli-context-tree.focus"),h.window.showInformationMessage("Agent Manager for Q CLI\uC5D0 \uD3EC\uCEE4\uC2A4\uD588\uC2B5\uB2C8\uB2E4!"),e.info("Agent Manager for Q CLI tree view focused successfully")}catch(l){let d=l;e.error("Failed to focus Agent Manager for Q CLI tree view",d),h.window.showErrorMessage(`Failed to focus Agent Manager for Q CLI: ${d.message}`)}}),o=h.commands.registerCommand("qcli-agents.createAgent",async()=>{try{e.logUserAction("Create Agent command executed");let{WizardWebviewProvider:l}=await Promise.resolve().then(()=>(Xe(),Ze));await new l(s,e).showWizard(),e.info("Agent creation wizard opened successfully")}catch(l){let d=l;e.error("Failed to open agent creation wizard",d),h.window.showErrorMessage(`Failed to open agent creation wizard: ${d.message}`)}}),r=new ie,i=h.commands.registerCommand("qcli-agents.syncFromPromptz",async()=>{try{e.logUserAction("PromptZ sync command executed");let{AgentConfigService:l}=await Promise.resolve().then(()=>(B(),H)),{ErrorHandler:d}=await Promise.resolve().then(()=>(he(),Me)),p=new d(e),f=new l(e,p);await new ae(r,f).execute()}catch(l){e.error("PromptZ sync failed",l),h.window.showErrorMessage(`PromptZ sync failed: ${l.message}`)}}),a=h.commands.registerCommand("qcli-agents.openAgent",async l=>{try{if(e.logUserAction("Open Agent command executed",{agentName:l?.label}),!l){await I.showErrorMessage("No agent selected to open");return}if(!u?.agentTreeProvider){await I.showWarningMessage("Agent management is still initializing. Please try again in a moment.",["Retry"]);return}let d=u.agentTreeProvider.agentManagementService;if(!d)throw new Error("Agent management service not available");await d.openAgentConfigFile(l)}catch(d){let p=d;e.error("Failed to open agent file",p)}}),n=h.commands.registerCommand("qcli-agents.deleteAgent",async l=>{try{if(e.logUserAction("Delete Agent command executed",{agentName:l?.label}),!l){await I.showErrorMessage("No agent selected to delete");return}let d=l.label||l.agentItem?.label;if(!d){await I.showErrorMessage("Invalid agent item: missing name");return}if(await h.window.showWarningMessage(`Are you sure you want to delete the agent "${d}"?`,{modal:!0},"Delete")!=="Delete")return;let f=u.agentTreeProvider.agentManagementService;if(!f)throw new Error("Agent management service not available");await f.deleteAgent(d),u.agentTreeProvider.refresh(),h.window.showInformationMessage(`Agent "${d}" deleted successfully`)}catch(d){e.error("Failed to delete agent",d),await I.handleError(d,"Failed to delete agent")}}),c=h.commands.registerCommand("qcli-agents.runAgent",async l=>{try{if(e.logUserAction("Run Agent command executed",{agentName:l?.label}),!l){await I.showErrorMessage("No agent selected to run");return}let d=l.label||l.agentItem?.label;if(!d){await I.showErrorMessage("Agent name not found");return}let p=h.window.createTerminal({name:`Q CLI - ${d}`,shellPath:process.env.SHELL||"/bin/bash"});p.show(),p.sendText(`q chat --agent "${d}"`),setTimeout(()=>{if(u?.agentTreeProvider){let f=u.agentTreeProvider.agentManagementService;f&&f.refreshAgentList()}},100)}catch(d){let p=d;e.error("Failed to run agent",p),await I.showErrorMessage(`Failed to run agent: ${p.message}`)}}),m=h.commands.registerCommand("qcli-agents.selectAgent",async l=>{try{if(e.info(`SELECT_AGENT command triggered for: ${l?.name||l?.label||"unknown"}`),!l){e.warn("No agent item provided to select command");return}u?.agentTreeProvider?(e.info("Calling selectAgent on agentTreeProvider"),u.agentTreeProvider.selectAgent(l),e.info("selectAgent method called successfully")):e.error("agentTreeProvider not available in extensionState")}catch(d){let p=d;e.error("Failed to select agent",p),await I.showErrorMessage(`Failed to select agent: ${p.message}`)}});s.original.subscriptions.push(t),s.original.subscriptions.push(o),s.original.subscriptions.push(a),s.original.subscriptions.push(n),s.original.subscriptions.push(c),s.original.subscriptions.push(m),e.debug("Core commands registered successfully")}catch(t){let o=t;throw e.error("Failed to register core commands",o),new Error(`Core command registration failed: ${o.message}`)}}g(bt,"registerCoreCommands");function st(){switch(h.workspace.getConfiguration("qcli-context").get("logLevel","info").toLowerCase()){case"debug":return 0;case"info":return 1;case"warn":return 2;case"error":return 3;default:return 1}}g(st,"getLogLevel");function Q(){return h.workspace.getConfiguration("qcli-context").get("enableDebugMode",!1)}g(Q,"isDebugMode");function ct(){return h.workspace.getConfiguration("qcli-context").get("showOutputOnError",!0)}g(ct,"getShowOutputOnError");function lt(){return h.workspace.getConfiguration("qcli-context").get("logToConsole",!1)}g(lt,"getLogToConsole");function yt(s,e){try{let t=h.workspace.onDidChangeConfiguration(o=>{if(o.affectsConfiguration("qcli-context.logLevel")){let r=st();e.setLogLevel(r),e.info(`Log level updated to: ${G[r]}`)}if(o.affectsConfiguration("qcli-context.enableDebugMode")){let r=Q();e.setDebugMode(r),e.info(`Debug mode ${r?"enabled":"disabled"}`)}(o.affectsConfiguration("qcli-context.showOutputOnError")||o.affectsConfiguration("qcli-context.logToConsole"))&&e.updateConfiguration({showOutputOnError:ct(),logToConsole:lt()})});s.original.subscriptions.push(t),e.debug("Configuration change listener registered successfully")}catch(t){let o=t;e.error("Failed to register configuration change listener",o)}}g(yt,"registerConfigurationChangeListener");async function xt(s,e,t){try{let o=Date.now();await Et(s,e);let r=Date.now()-o,i=Date.now()-t;e.logLifecycle("Non-critical components initialized",{initTime:`${r}ms`,totalActivationTime:`${i}ms`}),Q()&&h.window.showInformationMessage(`Agent Manager for Q CLI activated in ${i}ms`)}catch(o){let r=o;e.error("Failed to initialize non-critical components",r)}}g(xt,"initializeNonCriticalComponents");async function Et(s,e){try{await St(s,e),await At(s,e),e.debug("All tree view providers initialized successfully")}catch(t){let o=t;throw e.error("Failed to initialize tree view providers",o),new Error(`Tree view provider initialization failed: ${o.message}`)}}g(Et,"initializeTreeViewProvider");async function St(s,e){try{let{AgentTreeProvider:t}=await Promise.resolve().then(()=>(Ye(),Ke)),{AgentManagementService:o}=await Promise.resolve().then(()=>(Qe(),Je)),{AgentConfigService:r}=await Promise.resolve().then(()=>(B(),H)),{AgentLocationService:i}=await Promise.resolve().then(()=>(J(),ye)),a=new i,n=new r(e,I,a);await n.ensureAgentDirectory(),e.info("Agent directory ensured during extension activation");let c=new o(n,e,I),m=new t(c,e),l=h.window.createTreeView("qcli-agents-tree",{treeDataProvider:m,showCollapseAll:!0});l.onDidChangeSelection(p=>{if(p.selection&&p.selection.length>0){let f=p.selection[0];e.info(`Agent tree selection changed: ${f?.label||"unknown"}`),f&&"config"in f&&f.config&&(e.info(`Firing selection event for agent: ${f.config.name}`),m.handleAgentSelection(f))}}),s.subscriptions.push(l),u&&(u.agentTreeProvider=m),c.startFileWatcher();let d=h.commands.registerCommand("qcli-agents.refreshTree",async()=>{try{e.logUserAction("Refresh agent tree command executed");let p=Date.now();await c.refreshAgentList(),e.logTiming("Agent tree view refresh",p)}catch(p){let f=p;e.error("Failed to refresh agent tree",f),await I.showErrorMessage("Failed to refresh agent list. Please check your workspace and try again.",f,["Retry","Check Permissions","Open Settings"])}});s.subscriptions.push(d),e.debug("Agent tree view provider initialized successfully")}catch(t){let o=t;throw e.error("Failed to initialize agent tree view provider",o),new Error(`Agent tree view provider initialization failed: ${o.message}`)}}g(St,"initializeAgentTreeView");async function At(s,e){try{let{ContextTreeProvider:t}=await Promise.resolve().then(()=>(tt(),et)),{ContextResourceService:o}=await Promise.resolve().then(()=>(rt(),ot)),r=new o(e),i=u?.agentTreeProvider,a=new t(r,e,i),n=h.window.createTreeView("qcli-context-tree",{treeDataProvider:a,showCollapseAll:!0});s.subscriptions.push(n),u&&(u.contextTreeProvider=a,u.contextResourceService=r);let c=h.commands.registerCommand("qcli-context.refreshTree",()=>{e.logUserAction("Refresh context tree command executed");let L=Date.now();a.refresh(),e.logTiming("Context tree view refresh",L)}),{ContextResourceCommands:m}=await Promise.resolve().then(()=>(nt(),at)),l=new m(e),d=h.commands.registerCommand("qcli-context.openFile",L=>l.openFile(L)),p=h.commands.registerCommand("qcli-context.revealInExplorer",L=>l.revealInExplorer(L)),f=h.commands.registerCommand("qcli-context.copyPath",L=>l.copyPath(L)),C=h.commands.registerCommand("qcli-context.copyRelativePath",L=>l.copyRelativePath(L)),_=h.commands.registerCommand("qcli-context.searchFiles",()=>l.searchFiles(a)),ee=h.commands.registerCommand("qcli-context.clearSearch",()=>{a.clearSearchFilter(),h.window.showInformationMessage("Search filter cleared")}),W=h.commands.registerCommand("qcli-context.refreshResources",async()=>{try{u?.contextResourceService&&u.contextResourceService.resourceCache?.clear(),a.refresh(),h.window.showInformationMessage("Resources refreshed")}catch(L){e.error("Failed to refresh resources",L),h.window.showErrorMessage("Failed to refresh resources")}});s.subscriptions.push(c,d,p,f,C,_,ee,W),e.debug("Context tree view provider initialized successfully")}catch(t){let o=t;throw e.error("Failed to initialize context tree view provider",o),new Error(`Context tree view provider initialization failed: ${o.message}`)}}g(At,"initializeContextTreeView");function Ct(){u?.contextItems&&(u.contextItems.length=0)}g(Ct,"clearCachedData");function oe(){return u}g(oe,"getExtensionState");function kt(){return u?.isActivated===!0&&u?.contextTreeProvider!==void 0&&u?.agentTreeProvider!==void 0}g(kt,"isExtensionFullyInitialized");0&&(module.exports={activate,deactivate,getExtensionState,isExtensionFullyInitialized});
