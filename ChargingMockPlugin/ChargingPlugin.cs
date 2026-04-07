using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;

namespace Shell_Gems.Plugins
{
    public class chargingpluginPlugin
    {
        // ── Public edge-js boundary ──────────────────────────────────────────

        public async Task<object> GetFunctions(dynamic input)
        {
            return await GetFunctions();
        }

        public async Task<object> GetParams(dynamic input)
        {
            string functionName = (string)input.functionName;
            return await GetParams(functionName);
        }

        public async Task<object> Execute(dynamic input)
        {
            string functionName = (string)input.functionName;
            IDictionary<string, object> parameters = (IDictionary<string, object>)input.parameters;
            return await Execute(functionName, parameters);
        }

        // ── Private implementation ───────────────────────────────────────────

        private async Task<object> GetFunctions()
        {
            return new object[] {
                new {
                    name        = "GetAllChargingStations",
                    label       = "All Stations",
                    description = "Returns all charging stations with their cost and availability."
                },
                new {
                    name        = "UpdateChargingStationCost",
                    label       = "Update Cost",
                    description = "Updates the charging cost for a specific station."
                },
                new {
                    name        = "UpdateChargingAvailablePoints",
                    label       = "Update Points",
                    description = "Updates the number of available charging points for a station."
                }
            };
        }

        private async Task<object> GetParams(string functionName)
        {
            switch (functionName)
            {
                case "GetAllChargingStations":
                    return new object[] { };   // no parameters needed

                case "UpdateChargingStationCost":
                    return new object[] {
                        new { key = "stationId", type = "text",   label = "Station ID",  defaultValue = "ST-01", required = true },
                        new { key = "newCost",   type = "number", label = "New Cost",     defaultValue = 1.5,    required = true, min = 0, max = 100, step = 0.1 }
                    };

                case "UpdateChargingAvailablePoints":
                    return new object[] {
                        new { key = "stationId",         type = "text",   label = "Station ID",       defaultValue = "ST-01", required = true },
                        new { key = "newAvailablePoints", type = "number", label = "Available Points", defaultValue = 4,       required = true, min = 0, max = 100 }
                    };

                default:
                    throw new Exception($"Unknown function: {functionName}");
            }
        }

        private async Task<object> Execute(string functionName, IDictionary<string, object> parameters)
        {
            var method = GetType().GetMethod(
                functionName,
                BindingFlags.NonPublic | BindingFlags.Instance
            );

            if (method == null)
                throw new Exception($"No method '{functionName}' found on this plugin.");

            return await (Task<object>)method.Invoke(this, new object[] { parameters });
        }

        // ── Private function methods ─────────────────────────────────────────

        private async Task<object> GetAllChargingStations(IDictionary<string, object> parameters)
        {
            var stations = new object[] {
                new { stationId = "ST-01", cost = 1.5,  availablePoints = 4,  name = "City Center Charging" },
                new { stationId = "ST-02", cost = 2.0,  availablePoints = 0,  name = "Airport Rapid Charge" },
                new { stationId = "ST-03", cost = 1.0,  availablePoints = 12, name = "Mall Superchargers" }
            };

            return new {
                stations,
                _meta = new {
                    stations = new { label = "Charging Stations", format = "table" }
                }
            };
        }

        private async Task<object> UpdateChargingStationCost(IDictionary<string, object> parameters)
        {
            string stationId = (string)parameters["stationId"];
            double newCost   = Convert.ToDouble(parameters["newCost"]);

            return new {
                success   = true,
                stationId,
                newCost,
                message   = $"Cost for station {stationId} updated to {newCost} successfully.",
                _meta = new {
                    message = new { label = "Result" }
                }
            };
        }

        private async Task<object> UpdateChargingAvailablePoints(IDictionary<string, object> parameters)
        {
            string stationId = (string)parameters["stationId"];
            int    newPoints = Convert.ToInt32(parameters["newAvailablePoints"]);

            return new {
                success   = true,
                stationId,
                newAvailablePoints = newPoints,
                message            = $"Available points for station {stationId} updated to {newPoints} successfully.",
                _meta = new {
                    message = new { label = "Result" }
                }
            };
        }
    }
}
