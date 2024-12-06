import { Resource } from "sst";

// You can't stringify Resource so you have to rebuild it
// You need to stringify because printing out Resource directly isn't valid JSON
const resourceKeys = Object.keys(Resource);
const jsonResource = {};
for (const key of resourceKeys) {
  const resource = Resource[key];
  jsonResource[key] = resource;
}

console.log(JSON.stringify(jsonResource));
