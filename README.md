# Transform GraphQL

[![npm](https://img.shields.io/npm/v/transform-graphql.svg?style=flat-square)](https://www.npmjs.com/package/transform-graphql)  [![npm downloads](https://img.shields.io/npm/dt/transform-graphql.svg?style=flat-square)](https://www.npmjs.com/package/transform-graphql)
[![npm downloads](https://img.shields.io/github/workflow/status/graphql-editor/transform-graphql/release.svg?style=flat-square)](https://www.npmjs.com/package/transform-graphql)


We use GraphQL transformers. Examples are Graphback, Dgraph, AWS Amplify. This library provides function that given any GraphQL schema creates new GraphQL schemas basing on transformer functions.

## Installation

```sh
npm i transform-graphql
```

## How it works

Provide original schema with your transformer directives and an array of transformer functions defined by `TransformerDef` type

```ts

import { TransformGraphQLSchema } from 'transform-graphql';

const transformedSchema = TransformGraphQLSchema({ 
    schema: inputSchema, 
    transformers: [transformerCRUD] 
});


```

This short example simply shows what transform GraphQL is about:

Given the schema:
```graphql
type Post @model{
    name: String!
    content: String!
    createdAt: String!
}

type Query{
    version:String
}
type Mutation{
    version:String
}

directive @model on OBJECT
```
where model is our actual transformer

We expect schema to be transformed into

```graphql

directive @model on OBJECT

input CreatePost{
    name: String!
    content: String!
    createdAt: String!
}

input DetailsPost{
    id: String!
}

type Mutation{
    version: String
    post: PostMutation
}

type Post @model{
    name: String!
    content: String!
    createdAt: String!
}

type PostMutation{
    create(
            post: CreatePost
    ): String!
    update(
            post: UpdatePost
            details: DetailsPost
    ): String!
    remove(
            details: DetailsPost
    ): String!
}

type PostQuery{
    list: [Post!]!
    getByDetails(
            details: DetailsPost
    ): Post
}

type Query{
    version: String
    post: PostQuery
}
input UpdatePost{
    name: String!
    content: String!
    createdAt: String!
}
schema{
    query: Query,
    mutation: Mutation
}
```

And the transformer code should look like this

```ts
const inputSchema = `
type Post @model{
    name: String!
    content: String!
    createdAt: String!
}

type Query{
    version:String
}
type Mutation{
    version:String
}`
const transformerCRUD: TransformerDef = {
  transformer: ({ field, operations }) => {
    if (!field.args) {
      throw new Error('Model can be used only for types');
    }
    if (!operations.query) {
      throw new Error('Query type required');
    }
    if (!operations.mutation) {
      throw new Error('Query type required');
    }
    return `
      input Create${field.name}{
          ${TreeToGraphQL.parse({ nodes: field.args })}
      }
      input Update${field.name}{
          ${TreeToGraphQL.parse({ nodes: field.args })}
      }
      input Details${field.name}{
          id: String!
      }
      type ${field.name}Query{
          list: [${field.name}!]!
          getByDetails(details: Details${field.name}): ${field.name}
      }
      type ${field.name}Mutation{
          create( ${field.name[0].toLowerCase() + field.name.slice(1)}: Create${field.name} ): String!
          update( ${field.name[0].toLowerCase() + field.name.slice(1)}: Update${field.name}, details: Details${
      field.name
    } ): String!
          remove( details: Details${field.name} ): String!
      }
      extend type ${operations.query.name}{
          ${field.name[0].toLowerCase() + field.name.slice(1)}: ${field.name}Query
      }
      extend type ${operations.mutation.name}{
          ${field.name[0].toLowerCase() + field.name.slice(1)}: ${field.name}Mutation
      }
      `;
  },
  directiveName: 'model',
};
const transformedSchema = TransformGraphQLSchema({ schema: GraphQLTransform, transformers: [transformerCRUD] });
//transformed schema should look like in the example

```

## Roadmap

- provide CLI
- provide examples

