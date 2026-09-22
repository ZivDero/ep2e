# Unofficial Eclipse Phase 2e System for Foundry VTT

Heavily automated [Eclipse Phase 2e](https://www.eclipsephase.com) system.

## About this fork

This is a fork of [Bubz43/ep2e](https://github.com/Bubz43/ep2e) updated for **Foundry V14**. Version 2.0.0 and later require Foundry V14; use 1.3.x from the original repository for Foundry V13. The system id is unchanged (`ep2e`), so existing worlds keep working: install from this fork's manifest URL:

`https://github.com/ZivDero/ep2e/releases/latest/download/system.json`

### Upgrading an existing world

- **Back up the world first.** Opening a world in Foundry V14 migrates it, and V14 worlds can't be opened in V13 again.
- Installing this fork replaces an installed copy of the original system, since both use the id `ep2e`.
- Foundry V14 turns measured templates into Scene Regions. Area effects are now placed as regions. Areas placed before the upgrade may lose their edit button on chat cards and explosives; remove and place them again if needed.

## Status

The system is largely stable, but there are rough edges and unfinished features. Discoverability of features is sometimes a bit lacking. The original author's [discord](https://discord.gg/zs4jMnFqjx) server covers the system in general.

### Notable missing features and issues

- Transations are not setup properly. For languages other than English you would be best served waiting for the rewrite. 

- Proper support for hives
- Modular morphs, e.g. flexbots
- Jamming

## Incompatible modules

- PopOut! - The way it works is largely incompatible with how UI elements are rendered. An alternative, albeit a more resource intensive one, is to open a new tab with the same url.
- TurnMarker - The system uses a custom combat tracker to better support Eclipse Phase options, which is sadly incompatible with this module.
- Foundry V14 pop-out windows: the combat tracker, chat log and chat pop-outs can't be detached into separate browser windows, because the system's elements only work in the main window. Other apps can still be detached.

### **Future**

Making this has be quite a learning experience and mistakes have been made. Some of these will require fundamental design changes. These are extensive enough that this will take the form of a total rewrite. The current iteration of the system will continue to be supported until the next one is ready. The next iteration will not be backwards compatible with the current one, though a world migrator _might_ be feasible. More details to come...

## Credits

- System created by [Bubz43](https://github.com/Bubz43)
- Compendiums created by Daos

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/D1D24OIY7)
