# WP Dynamic Image Pointers: Interactive Diagram Hotspots

[![WordPress Tested](https://img.shields.io/badge/WordPress-5.8%2B-blue.svg)](https://wordpress.org)
[![PHP Version](https://img.shields.io/badge/PHP-7.4%2B-purple.svg)](https://php.net)
[![License: GPL v2](https://img.shields.io/badge/License-GPL%20v2-green.svg)](https://www.gnu.org/licenses/gpl-2.0.html)

**WP Dynamic Image Pointers** turns static images, technical diagrams, machine schematics, and equipment blueprints into interactive hotspot diagrams with synchronized detail specification cards.

---

## ✨ Features

- **Interactive Hotspot Pins**: Place customizable coordinate pointers directly over any diagram, photo, or blueprint.
- **Synchronized Spec Cards**: Hovering or clicking a hotspot smoothly scrolls to and highlights the matching description card, and vice versa.
- **Visual Admin Interface**: Easy-to-use WordPress admin panel to configure hotspots, image URLs, titles, and descriptions.
- **1-Click Backup & Migration**: Export and import complete pointer packages (including images and JSON configurations) for seamless staging-to-production migration.
- **Lightweight & Dependency-Free**: Built with vanilla CSS and JavaScript for fast load times without bulky frontend frameworks.
- **Responsive Design**: Automatically adapts for desktops, tablets, and mobile devices.

---

## 🚀 Installation

### Option A: Upload via WordPress Admin (.zip)
1. Download the latest `dynamic-image-pointers.zip` distribution.
2. In your WordPress admin, go to **Plugins** → **Add New Plugin** → **Upload Plugin**.
3. Choose `dynamic-image-pointers.zip` and click **Install Now**.
4. Click **Activate Plugin**.

### Option B: Clone via Git
Clone directly into your WordPress plugins folder:
```bash
cd wp-content/plugins/
git clone https://github.com/<your-username>/wp-dynamic-image-pointers.git dynamic-image-pointers
```

---

## 📌 Usage

### Shortcode Syntax

Insert the shortcode anywhere on a WordPress page, post, or page builder:

```text
[dynamic_pointers config="equipment-layout"]
```

### Shortcode Attributes

| Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `config` | `string` | *(Required)* | The unique configuration slug saved in the admin panel. |
| `title` | `string` | `''` | Optional custom heading to display above the interactive diagram. |

Example with a custom title:
```text
[dynamic_pointers config="hp-indigo-7k" title="HP Indigo 7K Digital Press Schematics"]
```

---

## 🛠️ Admin Management

Navigate to **Dynamic Pointers** in your WordPress admin menu:
1. **Create / Edit Config**: Upload an image, place pointer coordinates, and enter title/spec copy.
2. **Export Packages**: Generate a 1-click ZIP package or JSON file of any configuration.
3. **Import Packages**: Upload previously exported packages to restore or clone layouts.

---

## 📁 Directory Structure

```text
dynamic-image-pointers/
├── assets/
│   ├── admin.css              # WordPress admin styling
│   ├── admin.js               # Interactive admin pointer positioning & package manager
│   ├── dynamic-pointers.css   # Frontend responsive styling
│   └── dynamic-pointers.js    # Frontend hotspot interaction & scroll sync
├── dynamic-image-pointers.php # Main plugin bootstrap, DB migration, & AJAX handlers
├── README.md                  # Plugin documentation
└── .gitignore                 # Excludes local dumps, ZIPs, and OS files
```

---

## 📄 License

This project is licensed under the GNU General Public License v2.0 or later - see the [GNU GPL v2](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html) for details.
