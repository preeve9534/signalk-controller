/*
 * Copyright 2018 Paul Reeve <paul@pdjr.eu>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Schema = require("./lib/signalk-libschema/Schema.js");
const Log = require("./lib/signalk-liblog/Log.js");
const Notification = require('./lib/signalk-libnotification/Notification.js');

const Controller = require("./lib/Controller.js");
const ControllerServer = require("./lib/ControllerServer.js");

const PLUGIN_SCHEMA_FILE = __dirname + "/schema.json";
const PLUGIN_UISCHEMA_FILE = __dirname + "/uischema.json";
const DEBUG = false;

module.exports = function(app) {
	var plugin = {};

	plugin.id = "controller";
	plugin.name = "Environment controller";
	plugin.description = "Environmet controller with SignalK notification output";

    const log = new Log(plugin.id, { ncallback: app.setPluginStatus, ecallback: app.setPluginError });
    const notification = new Notification(app, plugin.id);

	plugin.schema = function() {
        if (DEBUG) log.N("plugin.schema()...", false);
        var schema = Schema.createSchema(PLUGIN_SCHEMA_FILE);
        return(schema.getSchema());
    };
 
	plugin.uiSchema = function() {
        if (DEBUG) log.N("plugin.uiSchema()...", false);
        var schema = Schema.createSchema(PLUGIN_UISCHEMA_FILE);
        return(schema.getSchema());
    }

	plugin.start = function(options) {
        if (DEBUG) log.N("plugin.start(" + JSON.stringify(options) + ")...", false);

        (async () => {
            // Initialise persistent storage and wait for this to happen...
            const storage = require('node-persist');
            await storage.init({ dir: options.database.directory });

            try {
                // Create controller instance using the opened storage...
                const controller = new Controller({
                    storage: storage,
                    channels: options.database.channels,
                    issueNotificationCallback: function(key, state, message) { notification.issue(key, message, { "state": state }); },
                    cancelNotificationCallback: function(key) { notification.cancel(key); },
                    debug: DEBUG
                });

                // Create server access to controller for remote clients...
                const server = new ControllerServer({
                    port: options.server.port,
                    allowedClients: options.clients,
                    controller: controller,
                    logCallback: function(m) { log.N(m); },
                    debug: DEBUG
                });

                server.start();
            } catch(e) {
                console.log("ERROR: " + e);
            }
        })();

	}

	plugin.stop = function() {
        if (DEBUG) log.N("plugin.stop()...", false);
	}

	return plugin;
}
