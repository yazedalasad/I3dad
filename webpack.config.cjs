const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@expo/vector-icons'],
      },
    },
    argv
  );

  // Add CSS loader support
  config.module.rules.push({
    test: /\.css$/,
    use: ['style-loader', 'css-loader'],
  });

  // Add entry point to include CSS
  const originalEntry = config.entry;
  config.entry = async () => {
    const entries = await originalEntry();
    
    // Inject CSS file
    if (Array.isArray(entries.app)) {
      entries.app.unshift(path.resolve(__dirname, 'app.web.css'));
    } else {
      entries.app = [path.resolve(__dirname, 'app.web.css'), entries.app];
    }
    
    return entries;
  };

  return config;
};
