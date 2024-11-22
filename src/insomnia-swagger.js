// convert insomnia v4 json to swagger, Rafael Leao rslgp@cin.ufpe.br
const yaml = require("js-yaml");

const outside_mem = [];

// TO DEBUG with console.log, VSCODE > HELP > TOGGLE DEVELOPER TOOLS
function convertToYaml(insomniaData) {
  // Extract the environment data
  let ENV = {}, ENV_REF = {};
  let existsENV = false, existsREFS = false;
  insomniaData.resources.forEach(
    (resource) => {
      if (resource._type === "environment") {
        if (resource.name === "ENVS") { ENV = resource.data; existsENV = true; }
        if (resource.name === "REFS") { ENV_REF = resource.data; existsREFS = true; }
      }
    }
  );

  //ALLOW use without config base enviroment
  if (existsENV === false) {
    ENV = {
      "SecurityFixEnabled": true,
      "API_URL": "https://<<PRODUCTION_URL>>",
      "API_URL_LOCAL": "http://localhost:3000",
      "info": {
        "description": "api desc (warning check extension guide, config on insomnia base enviroments)",
        "version": "1.0.0",
        "title": "api title",
        "contact": {
          "email": "author@gmail.com"
        }
      },
      "RESPONSES_TEMPLATE": {
        "200": {
          "description": "Success."
        },
        "400": {
          "description": "Missing params on request or validation error."
        },
        "401": {
          "description": "Access token is missing or invalid."
        },
        "403": {
          "description": "Forbidden."
        },
        "404": {
          "description": "Resource not found."
        },
        "406": {
          "description": "Not Acceptable."
        },
        "500": {
          "description": "Internal Error."
        }
      }
    }
  }//throw new Error('Missing ENVS inside Base Enviroment (check extension guide)');

  if (existsREFS === false) {
    ENV_REF = {
      "REFS": {
        "COMPONENTS": {
          "SECURITYSCHEMES": {},
          "RESPONSES": {},
          "SCHEMAS": {
            "MISSING_SECURITY": {
              "security_fix": true
            },
            "Pagination": {
              "limit": 1,
              "page": 1,
              "count": 0,
              "results": ["GENERIC ITEMS, from child components (allOf)"]
            },
            "EntityExample": {
              "column1": true
            }
          }
        }
      }
    }
  }//throw new Error('Missing REFS inside Base Enviroment (check extension guide)');

  /**
   *info:{
  description: "api desc",
  version: "1.0.0",
  title: "api title",
  contact: { email: "author@domain" },
}
   */
  const env_info = ENV.info;
  // Define the basic OpenAPI structure
  const openapiBase = {
    openapi: "3.0.0",
    info: env_info,
    servers: [
      {
        url: ENV.API_URL,
      },
      {
        url: ENV.API_URL_LOCAL,
      },
    ],
    paths: {},
    // security: [{bearerAuth:[]}],
    tags: [],
    components: { securitySchemes: {}, schemas: {}, responses: {} }, //refs
    // notes: {},
  };

  const MISSING = {
    DESCRIPTION:
      'Missing Insomnia descriptions, solution (insomnia description): resource_path > down arrow > settings > write > { "responses":{"200": {"description":"fixed"} } }',
    REQUEST_BODY: {
      "missing request_example in insomnia": true,
      "solution: supported (double quote) '$ref':'#/components/schemas/PagedExample', add on insomnia description, field": { "request_example": { "REQUEST_JSON": true } },
    },
    RESPONSE_BODY: {
      "missing insomnia 200 example response": true,
      "solution: supported (double quote) '$ref':'#/components/schemas/PagedExample', responses.200: ": { "schema": { "RESPONSE_JSON": true } },
    },
    SECURITY_FIX: {
      "application/json": {
        "schema": {
          $ref: "#/components/schemas/MISSING_SECURITY"
        }
      }
    }

  };
  MISSING.REQUEST_BODY.content = MISSING.SECURITY_FIX;
  MISSING.RESPONSE_BODY.content = MISSING.SECURITY_FIX;

  const PROP_TYPES = {
    "DEFAULT": 0,
    "ARRAY": 1,
    "REF": 2,
    "PAGED": 3,
  }

  const LIMITS = {
    MAX_LENGTH: 255,
    ACCEPTED_REGEX: ENV.REGEX_INPUT || "^[a-zA-Z0-9- ]+$"
  }
  function jsonToOpenApiSchema(jsonData) {
    if (typeof jsonData !== "object" || jsonData === null) {
      // return null; // Handle non-object data types
      return {};
    }

    const schema = {
      type: Array.isArray(jsonData) ? "array" : "object",
      properties: {},
    };
    if (ENV.SecurityFixEnabled) schema.additionalProperties = false; // security fix

    if (schema.type === "array") {
      // Attempt to infer schema for array items (if all items have the same structure)
      if (jsonData.length > 0) {
        schema.items = jsonToOpenApiSchema(jsonData[0]);
      }
    } else {
      // Infer property types for object properties
      for (let key in jsonData) {
        const value = jsonData[key];
        // console.log("DEBUG: ",typeof value, value, Array.isArray(value), key, key.indexOf("_GENERIC") !== -1, key.indexOf("anyof") !== -1, Array.isArray(value));
        let option = PROP_TYPES.DEFAULT;
        if (Array.isArray(value)) option = PROP_TYPES.ARRAY;
        if (key.indexOf("_$REF") !== -1) option = PROP_TYPES.REF;
        if (key.indexOf("_$PAGED") !== -1) option = PROP_TYPES.PAGED;
        let temp_prop = {};
        switch (option) {
          case PROP_TYPES.DEFAULT:
            temp_prop = {
              type: typeof value,
              example: value,
            };
            if (ENV.SecurityFixEnabled && value.constructor === Number) { // security fix
              temp_prop.minimum = 0;
              temp_prop.maximum = Number.MAX_VALUE;
              temp_prop.format = "int32";
            }
            break;

          case PROP_TYPES.ARRAY:
            temp_prop = {
              type: 'array',
              items: jsonToOpenApiSchema(value[0]),
            };
            break;

          case PROP_TYPES.REF:
            key = key.replace("_$REF", "");
            temp_prop = {
              $ref: value["_$ref"],
            };
            break;

          case PROP_TYPES.PAGED:
            key = "_$PAGED";
            temp_prop = {
              allOf: [
                {
                  $ref: '#/components/schemas/Pagination'
                },
                {
                  type: 'object',
                  properties: {
                    results: {
                      type: 'array',
                      items: { $ref: value }
                    }
                  },
                }
              ],
            };

            if (ENV.SecurityFixEnabled) { // DOC
              temp_prop.allOf[1].additionalProperties = false;
              temp_prop.additionalProperties = false;
            }
            break;
        }

        if (ENV.SecurityFixEnabled) {
          temp_prop.maxLength = LIMITS.MAX_LENGTH;
          temp_prop.pattern = LIMITS.ACCEPTED_REGEX;
        }
        schema.properties[key] = temp_prop;
      }
    }
    // console.log(schema);
    return schema;
  }

  // Helper function to get parent request group names
  const getRequestGroupNames = (resourceId, resources) => {
    let groupNames = [];
    let currentResource = resources.find((r) => r._id === resourceId);
    while (currentResource && currentResource._type === "request_group") {
      groupNames.unshift(currentResource.name);
      currentResource = resources.find((r) => r._id === currentResource.parentId);
    }
    return groupNames;
  };

  function getNestedValue(obj, path) {
    const pathArray = path.split('.');
    let result = obj;
    for (let key of pathArray) {
      if (result[key] === undefined) {
        result = undefined;
        break;
      }
      result = result[key];
    }

    return result;
  }
  const configParams = (param, in_tipo) => {
    if (param.name.includes("$ref") || param.name.includes("_$REF")) return { $ref: param.value }; //use components value

    if (param.value[3] === "_") { // using insomnia variables
      param.value = param.value.replace("_.", "").replace("{{ ", "").replace(" }}", "");
      param.value = getNestedValue(ENV_REF, param.value);
    }
    let configured = {
      name: param.name,
      in: in_tipo,
      description: param.description || "",
      required: param.disabled === undefined ? true : !param.disabled,
      schema: {
        type: "string", example: param.value,
      },
    };

    if (ENV.SecurityFixEnabled) {
      configured.schema.maxLength = LIMITS.MAX_LENGTH,
        configured.schema.pattern = LIMITS.ACCEPTED_REGEX
    }

    return configured;
  }

  const configREFS = (local_REFS) => {
    const ref_schemas = local_REFS.COMPONENTS.SCHEMAS;
    openapiBase.components.responses = local_REFS.COMPONENTS.RESPONSES || {};
    openapiBase.components.securitySchemes = local_REFS.COMPONENTS.SECURITYSCHEMES || {};
    openapiBase.components.parameters = local_REFS.COMPONENTS.PARAMETERS || {};
    // console.log(resource.data.REFS.COMPONENTS.SCHEMAS);
    for (let key in ref_schemas) {
      if (key.indexOf("Paged") !== -1) {
        let temp = jsonToOpenApiSchema(ref_schemas[key]);
        // console.log(">>> paged", key, temp)
        openapiBase.components.schemas[key] = temp.properties._$PAGED;
        temp = undefined; // GARBAGE COLLECTOR
      } else {
        openapiBase.components.schemas[key] = jsonToOpenApiSchema(ref_schemas[key]);
      }
    }
  }

  // const setEntity = (text, entity) => {
  //   return text.replace('$ENTITY', entity);
  // }
  Object.defineProperty(String.prototype, 'entity', { // DOC
    value: function (entity) {
      return this.replace('$ENTITY', entity);
    },
    writable: true,
    configurable: true
  });


  // Convert Insomnia requests to OpenAPI paths
  insomniaData.resources.forEach((resource) => {
    if (resource._type === "request") {
      const tags = getRequestGroupNames(
        resource.parentId,
        insomniaData.resources
      );
      const entity = tags[tags.length - 1];
      let path = resource.url.replace("{{API_URL}}", "");

      // $ENTITY REPLACE PART1 resource path
      resource.name = resource.name.entity(entity);
      path = path.entity(entity.toLowerCase());

      const method = resource.method.toLowerCase();
      const notes = resource.description || "";

      const queryParameters = {};
      const pathParameters = {};
      let description = {};
      let requestBodyExample = undefined,
        responseBodyExample = undefined;

      let desc_responses = ENV.RESPONSES_TEMPLATE || {
        200: {
          description: MISSING.DESCRIPTION,
          content: MISSING.SECURITY_FIX
        },
        400: {
          description: "Falta de parâmetros na requisição ou erros de validação.",
        },
        401: {
          description: "Access token is missing or invalid.",
        },
        403: {
          description: "Forbidden.",
        },
        404: {
          description: "Recurso não encontrado.",
        },
        406: {
          description: "Not Acceptable.",
        },
        500: {
          description: "Erro interno.",
        },
      };

      if (notes && notes[0] === "{") {
        //SETUP
        description = JSON.parse(notes);

        // $ENTITY REPLACE PART2 DESCRIPTION to generic and easy reuse
        if (description.response_example && description.response_example.schema) description.response_example.schema.$ref = description.response_example.schema.$ref.entity(entity);
        if (description.request_example && description.request_example["$ref"]) description.request_example["$ref"] = description.request_example["$ref"].entity(entity);
        if (description.summary) description.summary = description.summary.entity(entity);

        // expected responses
        let not_using_200 = false;
        for (let status in description.responses) {
          desc_responses[status] = description.responses[status];

          if (desc_responses[status].description) desc_responses[status].description = desc_responses[status].description.entity(entity); // use .entity here produces BUG in compiler, resuing responses from other entity
          if (status.startsWith("2")) {
            if (status !== "200") not_using_200 = true;
            responseBodyExample =
              desc_responses[status].schema || MISSING.RESPONSE_BODY;
            delete desc_responses[status].schema; // fix duplicated schema

            desc_responses[status].content = {
              "application/json": {
                schema: responseBodyExample["$ref"] ? { $ref: responseBodyExample["$ref"].entity(entity) } : jsonToOpenApiSchema(responseBodyExample),
              },
            };
          }
        }
        if (not_using_200 && desc_responses[200] !== MISSING.RESPONSE_BODY) {
          desc_responses[200] = undefined;
        }
        // console.log(">>> RESQUEST", description, resource.body, resource.body.mimeType, resource.body.text);
        let temp_request_body = resource.body.text;
        if (temp_request_body) description.request_example = JSON.parse(temp_request_body.entity(entity));
        temp_request_body = undefined;
        // request body schema
        if (method === "get" && description.request_example === undefined) {
          // not required request body on get, do nothing
        } else {
          requestBodyExample =
            description.request_example || MISSING.REQUEST_BODY;
          if (requestBodyExample["$ref"]) {
            requestBodyExample = {
              $ref: requestBodyExample["$ref"]
            };
          } else {
            requestBodyExample = jsonToOpenApiSchema(requestBodyExample);
          }
        }
        // response body schema
        // console.log(">>> DESC",description.response_example, typeof description.response_example);
        let temp_desc_resp = description.response_example;
        if (typeof temp_desc_resp === "object") {
          responseBodyExample = temp_desc_resp;
        }
        else if (temp_desc_resp === undefined)
          responseBodyExample = MISSING.RESPONSE_BODY;
        else responseBodyExample = JSON.parse(temp_desc_resp || "{}");
        temp_desc_resp = undefined;

      }


      let content_req_body = {};
      content_req_body = {
        content: {
          "application/json": {
            schema: requestBodyExample,
          },
        }
      };

      if (resource.body) {
        const mimeType = resource.body.mimeType;

        if (resource.body.text) {
          content_req_body = {
            content: {
              [mimeType]: {
                schema: jsonToOpenApiSchema(JSON.parse(resource.body.text)), // Use the parsed requestBodyExample object here
              },
            }
          };
        }

        // support multipart/form-data
        // Update to handle `multipart/form-data`
        if (mimeType === "multipart/form-data") {
          const multipartParams = resource.body.params || [];
          requestBodyExample = {
            content: {
              [mimeType]: {
                schema: {
                  type: "object",
                  properties: {},
                },
                encoding: {},
              },
            },
          };

          multipartParams.forEach((param) => {
            const isFile = param.type === "file";
            requestBodyExample.content[mimeType].schema.properties[param.name] = isFile
              ? { type: "string", format: "binary" } // For file uploads
              : { type: "string", example: param.value };

            // If encoding details are needed, add them
            if (isFile) {
              requestBodyExample.content[mimeType].encoding[param.name] = {
                contentType: "application/octet-stream",
              };
            }
          });

          content_req_body = requestBodyExample; // override content_req_body
        }

      }


      // Handle URL query parameters for GET requests
      // if(method=="get")console.log(">>> resource", resource)

      if (resource.parameters) //prevent error
        resource.parameters.forEach((param) => {
          // console.log(">>> param", param);
          queryParameters[param.name] = configParams(param, "query");
        });

      //handle path url
      if (resource.pathParameters) //prevent error
        resource.pathParameters.forEach((param) => {
          // console.log(">>> param", param);
          path = path.replace(`/:${param.name}`, `/{${param.name}}`);
          pathParameters[param.name] = configParams(param, "path");
        });

      if (!openapiBase.paths[path]) {
        openapiBase.paths[path] = {};
      }

      outside_mem.push({ ...desc_responses });

      openapiBase.paths[path][method] = {
        summary: description.summary || resource.name,
        security: [{
          bearerAuth: method == "get" ? "bearerAuth_read" : "bearerAuth_write"
        }],
        tags: [entity], //only leaves of tree folder structure
        parameters: Object.values(queryParameters).concat(Object.values(pathParameters)),
        responses: outside_mem[outside_mem.length - 1], // FIX BUG reusing response from one entity only
        requestBody: content_req_body,
      };

      if (!openapiBase.tags.some((t) => t.name === entity)) {
        openapiBase.tags.push({ name: entity });
      }

      // AUTO generate paginacao de todas entidades
      if (ENV_REF.REFS.COMPONENTS.SCHEMAS[`Paged${entity}`] === undefined && ENV_REF.REFS.COMPONENTS.SCHEMAS[entity]) {
        ENV_REF.REFS.COMPONENTS.SCHEMAS[`Paged${entity}`] = {
          "_$PAGED": `#/components/schemas/${entity}`
        }
      }
    }
  });
  configREFS(ENV_REF.REFS);

  // Convert the OpenAPI object to YAML
  let openapiYaml = yaml.dump(openapiBase);

  openapiYaml = openapiYaml.replaceAll("bearerAuth_read", '["read"]').replaceAll("bearerAuth_write", '["write"]');

  const securityChosen = Object.keys(openapiBase.components.securitySchemes)[0];
  if (securityChosen) {
    openapiYaml = openapiYaml.replaceAll("bearerAuth", securityChosen);
  }

  console.log("Conversion completed: openapi.yaml");
  return openapiYaml;
}

module.exports = { convertToYaml };