import { setLightValues, setThermostat, controlMusic } from './tools.schemas';

export const functionRegistry = {
  set_light_values: setLightValues,
  set_thermostat: setThermostat,
  control_music: controlMusic,
};

export const executeFunction = (name: string, args: any) => {
  const fn = functionRegistry[name as keyof typeof functionRegistry];
  if (!fn) throw new Error(`Function '${name}' not found`);
  return (fn as any)(args);
};

export const executeFunctionsParallel = async (calls: Array<{ name: string; args: any }>) =>
  Promise.allSettled(
    calls.map(async ({ name, args }) => ({
      name,
      args,
      result: await executeFunction(name, args),
    }))
  ).then(results =>
    results.map((result, i) =>
      result.status === 'fulfilled'
        ? result.value
        : { ...calls[i], result: null, error: String(result.reason) }
    )
);