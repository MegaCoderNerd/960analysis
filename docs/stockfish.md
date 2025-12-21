# Stockfish Integration

This project integrates the Stockfish chess engine for analysis. Stockfish is a powerful, free, and open-source chess engine.

## License

**Important:** Stockfish is licensed under the **GNU General Public License v3.0 (GPLv3)**.

When using Stockfish in this project, you must comply with the GPLv3 license terms. This includes:
- Providing access to the source code if you distribute the application
- Maintaining the GPL license for any derivative works
- Providing attribution to the Stockfish authors

For full license details, see: https://www.gnu.org/licenses/gpl-3.0.html

## Downloading Stockfish

The Stockfish binary files are **not included** in this repository to keep it lightweight and to allow users to obtain the latest version directly from the official source.

### Step-by-Step Instructions

1. **Visit the official Stockfish website:**
   - Go to https://stockfishchess.org/download/

2. **Download the browser/WASM build:**
   - Look for "Stockfish 17" or the latest version
   - Select the **"Browser/WASM"** or **"Web Assembly"** build
   - This typically includes files like:
     - `stockfish.wasm.js` (the loader script)
     - `stockfish.wasm` (the WebAssembly binary)
     - `stockfish.js` (optional, depending on the build)

3. **Alternative: Direct download from GitHub:**
   - Visit https://github.com/official-stockfish/Stockfish
   - Navigate to the releases section
   - Download the web/browser build for the latest version

4. **Place files in the correct directory:**
   ```
   public/
   └── stockfish/
       ├── stockfish.wasm.js
       └── stockfish.wasm
   ```

   Create the `public/stockfish/` directory if it doesn't exist:
   ```bash
   mkdir -p public/stockfish
   ```

5. **Copy the downloaded files:**
   ```bash
   cp /path/to/downloaded/stockfish.wasm.js public/stockfish/
   cp /path/to/downloaded/stockfish.wasm public/stockfish/
   ```

## Fallback Behavior

If the local Stockfish files are not present in `public/stockfish/`, the worker will automatically fall back to loading from the official Stockfish website (https://stockfishchess.org). However, for production use, it's recommended to:

1. Include the files locally for better performance and reliability
2. Ensure you comply with GPLv3 licensing requirements
3. Keep the files updated with the latest Stockfish version

## Verifying Installation

After placing the files, you can verify the installation by:

1. Starting your development server
2. Opening the browser console
3. Looking for any Stockfish-related errors

If everything is configured correctly, the engine should load without errors and be ready for analysis.

## Technical Details

The worker (`src/workers/stockfish.worker.ts`) handles:
- Loading the Stockfish WASM loader script
- Initializing the UCI protocol
- Processing analyze and stop commands
- Forwarding engine output to the main thread

Type declarations are available in `src/types/stockfish.d.ts` for TypeScript support.

## Resources

- **Official Website:** https://stockfishchess.org/
- **GitHub Repository:** https://github.com/official-stockfish/Stockfish
- **UCI Protocol:** https://www.chessprogramming.org/UCI
- **License (GPLv3):** https://www.gnu.org/licenses/gpl-3.0.html

## Support

For issues with Stockfish itself, please refer to the official Stockfish documentation and community resources. For issues with the integration in this project, please open an issue in this repository.
