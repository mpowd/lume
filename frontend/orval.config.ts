import { defineConfig } from 'orval'

export default defineConfig({
    lume: {
        input: {
            target: '../openapi.json',
        },
        output: {
            target: './src/api/generated.ts',
            client: 'react-query',
            httpClient: 'axios',
            override: {
                mutator: {
                    path: './src/api/axios-instance.ts',
                    name: 'customInstance',
                },
            },
        },
    },
})