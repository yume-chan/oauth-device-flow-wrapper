// @ts-ignore
const path = require('path');

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: './src/page/index.tsx',
    output: {
        // @ts-ignore
        path: path.resolve(__dirname, 'lib'),
        filename: 'page-bundle.js',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
    },
    module: {
        rules: [
            {
                test: /.tsx?$/,
                loader: 'awesome-typescript-loader',
                options: {
                    configFileName: 'tsconfig.web.json',
                    reportFiles: ['src/page/index.tsx'],
                },
            },
            {
                test: /.css$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                        },
                    },
                ],
            },
        ],
    },
};
