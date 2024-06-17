# Insomnia to Swagger README

**USAGE:** 
- config Base Enviroment with our ENVS and REFS (check CONFIGURE INSOMNIA)
- export collection from insomnia (v4 json) (if postman check FAQ)
- open on vscode the collection in JSON, `ctrl + shift + P`
- type `swagger`
- run command ```Convert insomnia (JSON) to swagger (YAML) openapi v3```
- save generated .yaml

## FAQ

**not have collection json exported?** on insomnia > enter collection > arrow down collection name > export > Insomnia v4 (JSON)

**using postman?** (Postman compatible) export collection > import on insomnia > GOTO [not have json exported]

## Features

Auto generate swagger openapi v3 from insomnia collection

## Requirements

- configure Insomnia with our Base Enviroment
- selected json of a collection exported from insomnia
- use request settings description as a json to custom behavior

**GUIDE**: [config Base Enviroment ] click on gear on row (Manage Environments) > (+) plus button > shared enviroment > create ENVS and REFS (copy quick start below)

## Reserved keywords tokens

- **$ENTITY** (will be replaced to closest parent folder of request)
- **$\_REF** (alias to $ref if get trouble with $ref key on json)
- **$\_PAGED** (used to auto generate pagination)
- request settings description:

```
"summary":{},
"responses": {
	"201": {
		"description": "$ENTITY creation sucess",
		"schema": {
			"$ref": "#/components/schemas/$ENTITY"
		}
	}
},
"request_example":{},
"response_example:{}
```

## COMMUNITY CONTRIBUTE:

We'd love your help in making this extension even better! Here are some ways you can contribute:

- [🐞 Report Issues here](https://github.com/rslgp/insomnia-to-swagger/issues)

      Encounter any bugs or unexpected behavior?
      Please create an issue on our

  [GitHub repository](https://github.com/rslgp/insomnia-to-swagger/).

Be sure to provide clear steps to reproduce the issue, along with any error messages or screenshots.

We appreciate any help you can provide!

## [REQUIRED] CONFIGURE INSOMNIA

ENVS

```json
{
  "SecurityFixEnabled": true,
  "API_URL": "https://<<PRODUCTION_URL>>",
  "API_URL_LOCAL": "http://localhost:3000",
  "info": {
    "description": "api desc",
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
```

![ENVS](https://raw.githubusercontent.com/rslgp/insomnia-to-swagger/main/images/ENVS.png)

![REFS](https://raw.githubusercontent.com/rslgp/insomnia-to-swagger/main/images/REFS.png)

```json
{
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
```

![Entity description config](https://raw.githubusercontent.com/rslgp/insomnia-to-swagger/main/images/Entity_1.png)

![Entity folder structure CRUD](https://raw.githubusercontent.com/rslgp/insomnia-to-swagger/main/images/Entity_2.png)

```
	ENTITY FOLDER
	--> GET request
	--> POST request
```

on request description (request > arrow down > settings > write) you can use a json

```
{
  "responses": {
    "201": {
      "description": "$ENTITY creation sucess",
      "schema": {
        "$ref": "#/components/schemas/$ENTITY"
      }
    }
  },
	"request_example":{
		"$ref": "#/components/schemas/$ENTITY"
	}
}
```

## Release Notes

### 1.0.0

done

### 1.0.1

(not yet)
Fixed issue #.

### 1.1.0

(not yet)
Added features X, Y, and Z.

---

# LICENSE

This extension is licensed under the [MIT License](https://github.com/rslgp/insomnia-to-swagger/blob/main/LICENSE)

# Sponsor

[![ko-fi](https://storage.ko-fi.com/cdn/kofi2.png?v=3)](https://ko-fi.com/Y8Y0ILDI5)

## dev-local

    vsce package && code --install-extension ./*.vsix
