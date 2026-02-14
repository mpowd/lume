import axios from 'axios'

const INSTANCE = axios.create({
    baseURL: 'http://localhost:8000',
})

export const customInstance = <T>(config: any): Promise<T> => {
    const promise = INSTANCE(config).then(({ data }) => data)
    return promise
}