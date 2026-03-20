using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;

namespace Shell_Gems.Plugins
{
    public class mockpluginPlugin
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

        // ── Private implementation — no dynamic ──────────────────────────────

        private async Task<object> GetFunctions()
        {
            return new object[] {
                new {
                    name        = "Echo",
                    label       = "Echo Input",
                    description = "Returns the input parameters exactly as they were sent, along with some metadata."
                },
                new {
                    name        = "Calculate",
                    label       = "Math Helper",
                    description = "Performs basic arithmetic on two numbers."
                }
            };
        }

        private async Task<object> GetParams(string functionName)
        {
            switch (functionName)
            {
                case "Echo":
                    return new object[] {
                        new { key = "message", type = "text",   label = "Message", defaultValue = "Hello World", required = true },
                        new { key = "flag",    type = "boolean", label = "Include Timestamp", defaultValue = true }
                    };

                case "Calculate":
                    return new object[] {
                        new { key = "num1", type = "number", label = "First Number",  defaultValue = 10, min = 0, max = 100 },
                        new { key = "num2", type = "number", label = "Second Number", defaultValue = 5,  min = 0, max = 100 },
                        new { key = "op",   type = "text",   label = "Operation (+, -, *, /)", defaultValue = "+" }
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

        private async Task<object> Echo(IDictionary<string, object> parameters)
        {
            string message = (string)parameters["message"];
            bool   flag    = (bool)  parameters["flag"];

            var result = new Dictionary<string, object> {
                { "receivedMessage", message },
                { "includeTimestamp", flag }
            };

            if (flag) {
                result["timestamp"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            }

            // Example of display hints (_meta)
            result["_meta"] = new Dictionary<string, object> {
                { "timestamp", new { label = "Processed At", format = "date" } },
                { "includeTimestamp", new { label = "Timestamp included?", format = "boolean" } }
            };

            return result;
        }

        private async Task<object> Calculate(IDictionary<string, object> parameters)
        {
            double n1 = Convert.ToDouble(parameters["num1"]);
            double n2 = Convert.ToDouble(parameters["num2"]);
            string op = (string)parameters["op"];

            double val = 0;
            switch (op) {
                case "+": val = n1 + n2; break;
                case "-": val = n1 - n2; break;
                case "*": val = n1 * n2; break;
                case "/": val = n1 / (n2 != 0 ? n2 : 1); break;
                default: throw new Exception("Invalid operation");
            }

            return new {
                input1 = n1,
                input2 = n2,
                operation = op,
                result = val,
                _meta = new {
                    result = new { label = "Calculation Result" }
                }
            };
        }
    }
}
