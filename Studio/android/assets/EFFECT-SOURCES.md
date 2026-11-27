# Expansion sources / licensing inventory

Checked against upstream project pages during this build. These are research
and porting candidates, NOT installed plug-ins or claims that their entire
catalogs run in ACID Camera. No third-party shader source was copied into 0.2;
the 53 bundled effect implementations are original code supplied under MIT.

| Collection | Upstream licensing indication | Useful material | Integration status |
|---|---|---|---|
| [Android GPUImage](https://github.com/wasabeef/android-gpuimage) | Apache-2.0 | Native Android OpenGL filters and filter groups | Candidate; not bundled |
| [GPUImage](https://github.com/BradLarson/GPUImage) | BSD-style; see License.txt | Large iOS image/video filter collection; shader techniques can be ported | Candidate; not bundled |
| [GPUImage2](https://github.com/BradLarson/GPUImage2) | BSD | Swift GPU image/video processing and filter chains | Candidate; not bundled |
| [glfx.js](https://github.com/evanw/glfx.js) | MIT | WebGL adjustments, blurs, distortions and drawing effects | Candidate; not bundled |
| [Seriously.js](https://github.com/brianchirls/Seriously.js) | Core MIT; individual plugins may differ | Realtime video compositor, keyed masks and effects | Candidate; per-plugin review needed |
| [GL Transitions](https://github.com/gl-transitions/gl-transitions) | Per-transition author/license header; many MIT | Two-image transitions, useful for view mixing and preset crossfades | Candidate; requires two-input adapter |
| [Libretro GLSL shaders](https://github.com/libretro/glsl-shaders) | Varies by shader; no single permissive license assumed | CRT, LCD, scanlines, retro reconstruction, multipass shaders | Candidate; inspect every imported shader's license and render assumptions |
| [frei0r](https://github.com/dyne/frei0r) | Repository GPL-2.0 indication | Portable native video filters and mixers | Candidate; native build and licensing review required |
| [G'MIC](https://gmic.eu/) | CeCILL family; component-specific LGPL-like/GPL-compatible terms | Extensive image processing and artistic filters | Candidate; many algorithms need offline processing or substantial GPU ports |
| [LYGIA](https://github.com/patriciogonzalezvivo/lygia) | Prosperity / Patron dual terms, including commercial restrictions | Modular shader functions | Not treated as unrestricted open source; excluded from bundled code |

A source link is not a complete integration. Every future imported effect
needs a pinned revision, exact file-level license, attribution, parameter
schema, sampler/texture requirements, mobile GPU validation and a performance
budget. Desktop C/C++ effects, Swift frameworks, WebGL components and multipass
emulator shaders are not interchangeable Android plug-ins.

The app deliberately imports data-only JSON profiles, not arbitrary executable
shader packages. The source distribution contains the actual supported
catalog, parameter descriptions, default values and every shipped profile.
