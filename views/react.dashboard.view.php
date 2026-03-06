<?php
/** @var CView $this */
$page = (new CHtmlPage())->setTitle($data['title']);
$page->addItem((new CDiv(''))->setId('react-root'));
$page->show();
?>

<script src="https://unpkg.com/react@18/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js" integrity="sha384-Fo0OdKhdnE7y2WmzjOMW4PYjHkkANeu1501pWTqKrzAPeJMFQb4ZTdAA9dtrVUJV" crossorigin="anonymous"></script>
<script src="https://unpkg.com/lodash@4.17.21/lodash.min.js" integrity="sha384-H6KKS1H1WwuERMSm+54dYLzjg0fKqRK5ZRyASdbrI/lwrCc6bXEmtGYr5SwvP1pZ" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-grid-layout@1.3.4/dist/react-grid-layout.min.js" integrity="sha384-PMbm/Us//mtmFQhmt5dDcZ9dGQ9JETuWPP1XMrUTSSom54+ALzXwWFZbcVxIUW8C" crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://unpkg.com/react-grid-layout@1.3.4/css/styles.css" integrity="sha384-nGjHHKSA2do+/Ysq7iVR0BAmx0k68mY3XcGReJJ3LUu7bdewE5rLWUPJw+UoQKer" crossorigin="anonymous">

<style>
    :root {
        <?php $is_dark = (isset($data['user_theme']) && strpos($data['user_theme'], 'dark') !== false); ?>
        --bg-color: <?php echo $is_dark ? '#0b1016' : '#eef2f7'; ?>;
        --bg-elev-1: <?php echo $is_dark ? '#111822' : '#f9fbfd'; ?>;
        --card-bg: <?php echo $is_dark ? '#171f2b' : '#ffffff'; ?>;
        --text-color: <?php echo $is_dark ? '#dce4ef' : '#1f2937'; ?>;
        --header-bg: <?php echo $is_dark ? '#202a37' : '#e6ecf4'; ?>;
        --border-color: <?php echo $is_dark ? '#2a3546' : '#d7e0ea'; ?>;
        --subtle-text: <?php echo $is_dark ? '#93a4b8' : '#5f7188'; ?>;
        --panel-bg: <?php echo $is_dark ? '#131b25' : '#f6f9fc'; ?>;
        --input-bg: <?php echo $is_dark ? '#0f1620' : '#ffffff'; ?>;
        --segment-bg: <?php echo $is_dark ? '#121a25' : '#edf2f7'; ?>;
        --segment-active: <?php echo $is_dark ? '#28384d' : '#d8e4f1'; ?>;
        --accent-color: #4ea1f3;
        --accent-color-soft: rgba(78, 161, 243, 0.2);
        --success-color: #73bf69;
        --font-sans: "IBM Plex Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    body {
        background:
            radial-gradient(1300px 600px at 10% -10%, rgba(78, 161, 243, 0.13), transparent 60%),
            radial-gradient(900px 500px at 100% 0%, rgba(115, 191, 105, 0.12), transparent 55%),
            var(--bg-color);
        color: var(--text-color);
        font-family: var(--font-sans);
        margin: 0;
        padding: 0;
    }

    #react-root {
        min-height: calc(100vh - 76px);
    }

    .dashboard-shell {
        padding: 18px;
    }

    .dashboard-topbar {
        margin-bottom: 14px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 46%), var(--bg-elev-1);
        padding: 12px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .dashboard-title {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.01em;
    }

    .dashboard-title-block {
        min-width: 0;
    }

    .dashboard-meta {
        margin-top: 3px;
        color: var(--subtle-text);
        font-size: 12px;
        font-family: var(--font-mono);
    }

    .dashboard-actions {
        position: relative;
        flex-shrink: 0;
    }

    .btn-add-widget {
        height: 34px;
        padding: 0 14px;
        border-radius: 6px;
        border: 1px solid #406f41;
        background: linear-gradient(180deg, #6dbb65, #5ea356);
        color: #0c1910;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.01em;
        cursor: pointer;
    }

    .btn-add-widget:hover {
        filter: brightness(1.06);
    }

    .add-widget-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        min-width: 190px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--panel-bg);
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.35);
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 120;
    }

    .add-widget-item {
        width: 100%;
        text-align: left;
        border: 1px solid transparent;
        background: transparent;
        color: var(--text-color);
        border-radius: 5px;
        height: 34px;
        padding: 0 10px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
    }

    .add-widget-item:hover {
        background: var(--segment-active);
        border-color: var(--border-color);
    }

    .dashboard-grid-host {
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-elev-1);
        padding: 8px;
    }

    .react-grid-item.react-grid-placeholder {
        background: var(--accent-color-soft);
        border: 1px dashed var(--accent-color);
        border-radius: 6px;
    }

    .widget-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24);
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }

    .widget-header {
        padding: 8px 12px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 52%), var(--header-bg);
        border-bottom: 1px solid var(--border-color);
        color: #fff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: grab;
        gap: 8px;
    }

    .widget-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .widget-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .btn-zbx {
        background: rgba(8, 13, 18, 0.55);
        border: 1px solid rgba(152, 170, 190, 0.35);
        color: #dce4ef;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        height: 26px;
        padding: 0 10px;
        cursor: pointer;
    }

    .btn-zbx:hover { background: rgba(19, 29, 42, 0.95); }

    .btn-danger {
        width: 26px;
        padding: 0;
        background: #a63f3f;
        border-color: #bd5a5a;
    }

    .btn-danger:hover { background: #c34d4d; }

    .widget-body {
        flex: 1;
        padding: 14px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 0;
        overflow: hidden;
    }

    .widget-floating-actions {
        position: absolute;
        right: 8px;
        top: 8px;
        z-index: 20;
        display: inline-flex;
        gap: 6px;
    }

    .clock-view {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        text-align: center;
    }

    .clock-time {
        font-size: var(--clock-time-size, 44px);
        font-weight: var(--clock-time-weight, 700);
        line-height: 1.02;
        color: var(--clock-time-color, var(--text-color));
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    .clock-date {
        font-size: var(--clock-date-size, 13px);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--subtle-text);
    }

    .clock-timezone {
        font-size: var(--clock-date-size, 12px);
        color: var(--subtle-text);
        font-family: var(--font-mono);
    }

    .clock-face {
        width: var(--clock-size, 180px);
        height: var(--clock-size, 180px);
        position: relative;
        border-radius: 50%;
        border: max(2px, calc(var(--clock-size) * 0.035)) solid <?php echo $is_dark ? '#111' : '#2a2a2a'; ?>;
        background: <?php echo $is_dark ? '#f3f3f3' : '#fff'; ?>;
        box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
        flex: 0 0 auto;
    }

    .clock-tick {
        position: absolute;
        left: 50%;
        top: 50%;
        width: max(1px, calc(var(--clock-size) * 0.010));
        height: calc(var(--clock-size) * 0.06);
        background: #2e2e2e;
    }

    .clock-tick.major {
        height: calc(var(--clock-size) * 0.09);
        width: max(2px, calc(var(--clock-size) * 0.015));
        background: #111;
    }

    .clock-number {
        position: absolute;
        left: 50%;
        top: 50%;
        width: calc(var(--clock-size) * 0.17);
        height: calc(var(--clock-size) * 0.17);
        margin-left: calc(var(--clock-size) * -0.085);
        margin-top: calc(var(--clock-size) * -0.085);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #111;
        font-weight: 700;
        font-size: calc(var(--clock-size) * 0.1);
        user-select: none;
    }

    .clock-hand {
        position: absolute;
        left: 50%;
        bottom: 50%;
        transform-origin: 50% 100%;
        border-radius: 999px;
    }

    .clock-hand.hour {
        width: max(3px, calc(var(--clock-size) * 0.03));
        height: calc(var(--clock-size) * 0.24);
        background: #111;
    }

    .clock-hand.min {
        width: max(2px, calc(var(--clock-size) * 0.02));
        height: calc(var(--clock-size) * 0.34);
        background: #111;
    }

    .clock-hand.sec {
        width: max(1px, calc(var(--clock-size) * 0.012));
        height: calc(var(--clock-size) * 0.4);
        background: #b91515;
    }

    .clock-center {
        position: absolute;
        left: 50%;
        top: 50%;
        width: calc(var(--clock-size) * 0.06);
        height: calc(var(--clock-size) * 0.06);
        margin-left: calc(var(--clock-size) * -0.03);
        margin-top: calc(var(--clock-size) * -0.03);
        background: #111;
        border-radius: 50%;
    }

    .clock-editor {
        width: 100%;
        max-width: 620px;
        border: 1px solid var(--border-color);
        background: var(--panel-bg);
        border-radius: 4px;
        padding: 12px;
        overflow: auto;
        max-height: 100%;
    }

    .clock-editor--timestate {
        max-width: none;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .clock-editor--timestate > .editor-grid,
    .clock-editor--timestate > .editor-advanced {
        width: 100%;
    }

    .editor-title {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 10px;
    }

    .editor-grid {
        display: grid;
        grid-template-columns: 180px 1fr;
        row-gap: 10px;
        column-gap: 10px;
        align-items: center;
    }

    .editor-label {
        font-size: 12px;
        color: var(--subtle-text);
        font-weight: 700;
    }

    .editor-control input[type="text"],
    .editor-control select,
    .editor-control input[type="number"] {
        width: 100%;
        box-sizing: border-box;
        height: 30px;
        border: 1px solid var(--border-color);
        background: var(--input-bg);
        color: var(--text-color);
        border-radius: 2px;
        padding: 0 8px;
        font-size: 12px;
    }

    .editor-control .editor-textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--border-color);
        background: var(--input-bg);
        color: var(--text-color);
        border-radius: 2px;
        padding: 6px 8px;
        resize: vertical;
        min-height: 62px;
        font-size: 12px;
    }

    .editor-host-list,
    .editor-item-list {
        max-height: 150px;
        overflow: auto;
        border: 1px solid var(--border-color);
        border-radius: 2px;
        background: var(--input-bg);
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .editor-host-list--picker {
        max-height: 220px;
    }

    .editor-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 18, 24, 0.62);
        z-index: 1200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 14px;
    }

    .editor-modal {
        width: min(760px, 100%);
        max-height: min(80vh, 760px);
        background: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .editor-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        gap: 8px;
    }

    .editor-picker-panel {
        margin-top: 8px;
        border: 1px solid var(--border-color);
        border-radius: 2px;
        background: var(--segment-bg);
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .editor-datasets {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .editor-dataset {
        border: 1px solid var(--border-color);
        border-radius: 3px;
        background: var(--segment-bg);
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .editor-dataset.is-active {
        border-color: #7f9fba;
        box-shadow: inset 0 0 0 1px rgba(138, 177, 206, 0.25);
    }

    .editor-dataset-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
    }

    .editor-dataset-grid > label {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .editor-dataset-grid > label.is-full {
        grid-column: 1 / -1;
    }

    .timestate-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .timestate-group-header {
        width: 100%;
        border: 1px solid var(--border-color);
        background: var(--segment-bg);
        color: var(--text-color);
        border-radius: 2px;
        padding: 4px 8px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
    }

    .editor-host-item,
    .editor-item-entry {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        min-height: 20px;
    }

    .editor-item-entry span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .editor-inline-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .editor-subtle {
        color: var(--subtle-text);
        font-size: 11px;
    }

    .editor-mapping-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .editor-mapping-row {
        display: grid;
        grid-template-columns: 92px 1fr 72px 30px;
        gap: 6px;
        align-items: center;
    }

    .rd-color-picker {
        position: relative;
        display: inline-flex;
        min-width: 0;
    }

    .rd-color-trigger {
        width: 42px;
        height: 30px;
        padding: 0;
        border: 1px solid var(--border-color);
        border-radius: 2px;
        background: var(--input-bg);
        cursor: pointer;
        position: relative;
    }

    .rd-color-trigger-swatch {
        position: absolute;
        inset: 4px;
        border-radius: 1px;
        border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .rd-color-popover {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        width: min(420px, 92vw);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--panel-bg);
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.4);
        padding: 10px;
        z-index: 220;
    }

    .rd-color-tabs {
        display: inline-flex;
        gap: 8px;
        margin-bottom: 10px;
    }

    .rd-color-tab {
        height: 34px;
        min-width: 82px;
        border: 1px solid var(--border-color);
        border-radius: 10px;
        background: rgba(22, 32, 46, 0.9);
        color: var(--subtle-text);
        font-size: 12px;
        font-weight: 700;
        padding: 0 12px;
        cursor: pointer;
    }

    .rd-color-tab.active {
        background: rgba(53, 138, 90, 0.9);
        color: #f3fff7;
        border-color: rgba(95, 186, 133, 0.75);
    }

    .rd-color-grid {
        display: grid;
        grid-template-columns: repeat(8, minmax(0, 1fr));
        gap: 8px;
    }

    .rd-color-swatch {
        width: 100%;
        height: 24px;
        border-radius: 999px;
        border: 1px solid var(--border-color);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
        cursor: pointer;
        padding: 0;
    }

    .rd-color-custom {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .rd-color-custom-top {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: center;
    }

    .rd-color-custom-input {
        height: 32px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: var(--input-bg);
        color: var(--text-color);
        font-size: 12px;
        padding: 0 8px;
        font-family: var(--font-mono);
        text-transform: uppercase;
    }

    .rd-color-custom-apply {
        height: 36px;
        border: 1px solid #2f7ef3;
        border-radius: 10px;
        background: rgba(33, 113, 230, 0.22);
        color: #dbe9ff;
        font-size: 12px;
        font-weight: 700;
        padding: 0 14px;
        cursor: pointer;
    }

    .rd-color-custom-apply:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    .rd-color-section-label {
        color: var(--subtle-text);
        font-size: 12px;
        font-weight: 700;
    }

    .rd-color-wheel-row {
        display: grid;
        grid-template-columns: 150px 1fr;
        gap: 10px;
        align-items: center;
    }

    .rd-color-wheel {
        position: relative;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        border: 2px solid #2f4f7a;
        background:
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0) 58%),
            conic-gradient(
                #ff0000,
                #ffff00,
                #00ff00,
                #00ffff,
                #0000ff,
                #ff00ff,
                #ff0000
            );
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
        cursor: crosshair;
    }

    .rd-color-wheel-marker {
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 4px solid #ffffff;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.55);
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .rd-color-sliders {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .rd-color-slider-row {
        display: grid;
        grid-template-columns: 16px 1fr;
        align-items: center;
        gap: 10px;
    }

    .rd-color-slider-row span {
        color: var(--subtle-text);
        font-weight: 700;
    }

    .rd-color-slider-row input[type="range"] {
        width: 100%;
    }

    .rd-color-divider {
        border-top: 1px solid var(--border-color);
    }

    .rd-color-harmony-modes {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .rd-color-harmony-btn {
        height: 34px;
        border: 1px solid var(--border-color);
        border-radius: 10px;
        background: var(--input-bg);
        color: #c8d4e5;
        font-size: 13px;
        font-weight: 700;
        padding: 0 12px;
        cursor: pointer;
    }

    .rd-color-harmony-btn.active {
        background: rgba(53, 138, 90, 0.9);
        color: #f3fff7;
        border-color: rgba(95, 186, 133, 0.75);
    }

    .rd-color-harmony-swatches {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 8px;
    }

    .rd-color-harmony-swatch {
        width: 100%;
        height: 34px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 12px;
        cursor: pointer;
        padding: 0;
    }

    .rd-color-custom-actions {
        display: flex;
        justify-content: flex-end;
    }

    .rd-color-reset-btn {
        height: 30px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--input-bg);
        color: var(--text-color);
        font-size: 12px;
        font-weight: 700;
        padding: 0 12px;
        cursor: pointer;
    }

    .rd-color-harmony-btn:disabled,
    .rd-color-reset-btn:disabled,
    .rd-color-swatch:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    @media (max-width: 760px) {
        .rd-color-popover {
            width: min(94vw, 420px);
        }

        .rd-color-wheel-row {
            grid-template-columns: 1fr;
        }

        .rd-color-wheel {
            margin: 0 auto;
        }
    }

    .editor-range-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
        width: 100%;
        min-width: 0;
    }

    .editor-range-fields input {
        width: 100%;
        min-width: 0;
    }

    .editor-segment {
        display: inline-flex;
        border: 1px solid var(--border-color);
        background: var(--segment-bg);
        border-radius: 2px;
        padding: 2px;
        gap: 2px;
    }

    .editor-segment button {
        border: 0;
        background: transparent;
        color: var(--text-color);
        height: 24px;
        padding: 0 10px;
        font-size: 12px;
        font-weight: 700;
        border-radius: 2px;
        cursor: pointer;
    }

    .editor-segment button.active {
        background: var(--segment-active);
    }

    .editor-checks {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
    }

    .editor-checks label {
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    .editor-advanced {
        margin-top: 12px;
        border-top: 1px solid var(--border-color);
        padding-top: 10px;
    }

    .editor-advanced-title {
        font-size: 12px;
        font-weight: 700;
        text-decoration: underline;
        margin-bottom: 8px;
    }

    .editor-footer {
        margin-top: 12px;
        display: flex;
        justify-content: flex-end;
    }

    .editor-footer .btn-zbx {
        height: 30px;
        background: <?php echo $is_dark ? '#546577' : '#6b8ba2'; ?>;
        border-color: <?php echo $is_dark ? '#687f96' : '#8ea6b8'; ?>;
    }

    .widget-body--timestate {
        justify-content: stretch;
        align-items: stretch;
    }

    .timestate-root {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 0;
    }

    .timestate-table {
        flex: 1;
        min-height: 0;
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-right: 4px;
    }

    .timestate-row {
        display: grid;
        grid-template-columns: minmax(160px, 260px) 1fr;
        gap: 8px;
        align-items: center;
        min-height: 24px;
    }

    .timestate-label {
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--subtle-text);
    }

    .timestate-lane {
        position: relative;
        height: 22px;
        border: 1px solid var(--border-color);
        border-radius: 2px;
        background: <?php echo $is_dark ? '#2a2f35' : '#f3f6f8'; ?>;
        overflow: hidden;
    }

    .timestate-gridline {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(255, 255, 255, 0.14);
        pointer-events: none;
        z-index: 1;
    }

    .timestate-segment {
        position: absolute;
        top: 0;
        bottom: 0;
        border-right: 1px solid rgba(0, 0, 0, 0.2);
        z-index: 2;
        overflow: hidden;
    }

    .timestate-segment-label {
        position: absolute;
        left: 4px;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(255, 255, 255, 0.95);
        font-size: 10px;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
    }

    .timestate-axis {
        position: relative;
        height: 18px;
        color: var(--subtle-text);
        font-size: 11px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .timestate-axis-tick {
        position: absolute;
        top: 0;
        transform: translateX(-50%);
        white-space: nowrap;
    }

    .timestate-axis-tick:first-child {
        transform: none;
        left: 0 !important;
    }

    .timestate-axis-tick:last-child {
        transform: translateX(-100%);
        left: 100% !important;
    }

    .timestate-legend {
        border-top: 1px solid var(--border-color);
        padding-top: 6px;
    }

    .timestate-legend-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
    }

    .timestate-legend-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--subtle-text);
    }

    .timestate-legend-swatch {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 2px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        margin-right: 4px;
    }

    .timestate-legend--table table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        color: var(--subtle-text);
    }

    .timestate-legend--table th,
    .timestate-legend--table td {
        text-align: left;
        padding: 4px 6px;
        border-bottom: 1px solid var(--border-color);
    }

    .timestate-empty,
    .timestate-error {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--subtle-text);
        font-size: 12px;
        text-align: center;
        padding: 12px;
    }

    .timestate-error {
        color: #d27878;
    }

    @media (max-width: 900px) {
        .dashboard-shell {
            padding: 10px;
        }
        .dashboard-topbar {
            flex-direction: column;
            align-items: stretch;
        }
        .dashboard-actions {
            width: 100%;
        }
        .btn-add-widget {
            width: 100%;
        }
        .add-widget-menu {
            left: 0;
            right: auto;
            width: 100%;
        }
        .editor-mapping-row {
            grid-template-columns: 1fr;
        }
        .editor-grid { grid-template-columns: 1fr; }
        .editor-dataset-grid { grid-template-columns: 1fr; }
        .timestate-row { grid-template-columns: 1fr; gap: 4px; }
    }
</style>

<?php
$module_base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$zabbix_config = [
    'module_base' => $module_base,
    'api_url' => $module_base . '/zabbix.php?action=react.dashboard',
    'api_fallback_url' => $module_base . '/zabbix.php?action=react.dashboard'
];
?>
<script>
    window.ZABBIX_CONFIG = <?php echo json_encode($zabbix_config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
</script>

<?php
$widgets_dir = $data['module_path'] . '/assets/js/widgets';
$components_dir = $data['module_path'] . '/assets/js/components';
$color_picker_file = $components_dir . '/ColorPickerField.js';
$timestate_widget_file = $widgets_dir . '/TimeStateWidget.js';

if (is_file($color_picker_file)) {
    $component_script = file_get_contents($color_picker_file);
    if ($component_script === false) {
        $component_script = '';
    }
    $component_script = preg_replace('~</script~i', '<\\/script', $component_script);
    echo '<script type="text/babel" data-presets="react">' . "\n";
    echo $component_script;
    echo "\n</script>\n";
}

if (is_file($timestate_widget_file)) {
    $widget_script = file_get_contents($timestate_widget_file);
    if ($widget_script === false) {
        $widget_script = '';
    }
    $widget_script = preg_replace('~</script~i', '<\\/script', $widget_script);
    echo '<script type="text/babel" data-presets="react">' . "\n";
    echo $widget_script;
    echo "\n</script>\n";
}
?>

<script type="text/babel">
    const { useState, useEffect, useMemo, useRef, useCallback } = React;
    const GridLayout = window.ReactGridLayout;

    const createDashboardApiClient = (config) => {
        const moduleBase = String((config && config.module_base) || '').replace(/\/+$/, '');
        const candidates = Array.from(new Set([
            config && config.api_url,
            config && config.api_fallback_url,
            `${moduleBase}/zabbix.php?action=react.dashboard`,
            'zabbix.php?action=react.dashboard'
        ].filter(Boolean)));

        const cache = new Map();
        const inFlight = new Map();

        const toParams = (paramsInput) => (
            paramsInput instanceof URLSearchParams
                ? paramsInput
                : new URLSearchParams(paramsInput || {})
        );

        const requestJson = async (paramsInput) => {
            const params = toParams(paramsInput);
            let lastError = null;

            for (const base of candidates) {
                const separator = String(base).includes('?') ? '&' : '?';
                const url = `${base}${separator}${params.toString()}`;
                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        credentials: 'same-origin',
                        headers: { Accept: 'application/json' }
                    });
                    const text = await response.text();
                    let payload = null;
                    try {
                        payload = JSON.parse(text);
                    }
                    catch (_parseError) {
                        throw new Error(`API response is geen JSON (${url}). Eerste bytes: ${text.slice(0, 80)}`);
                    }

                    if (!response.ok) {
                        throw new Error((payload && payload.error) ? payload.error : `HTTP ${response.status}`);
                    }
                    if (payload && typeof payload === 'object' && payload.error) {
                        throw new Error(payload.error);
                    }

                    return payload;
                }
                catch (err) {
                    lastError = err;
                }
            }

            throw (lastError || new Error('API request failed'));
        };

        const cachedRequest = async (paramsInput, ttlMs = 15000) => {
            const params = toParams(paramsInput);
            const key = params.toString();
            const now = Date.now();
            const hit = cache.get(key);
            if (hit && (now - hit.ts) < ttlMs) {
                return hit.payload;
            }

            if (inFlight.has(key)) {
                return inFlight.get(key);
            }

            const promise = requestJson(params).then((payload) => {
                cache.set(key, { ts: Date.now(), payload });
                inFlight.delete(key);
                return payload;
            }).catch((err) => {
                inFlight.delete(key);
                throw err;
            });

            inFlight.set(key, promise);
            return promise;
        };

        return { requestJson, cachedRequest };
    };

    const DEFAULT_WIDGET = {
        type: 'Clock',
        name: 'default',
        showHeader: true,
        refreshInterval: 'default',
        timeType: 'local',
        clockType: 'analog',
        showDate: true,
        showTime: true,
        showTimezone: false,
        background: 'theme',
        timeBold: false,
        showSeconds: true,
        hourFormat: '24',
        dateSize: 100,
        timezone: 'Europe/Brussels'
    };

    const REFRESH_OPTIONS = [
        { value: 'default', label: 'Default (15 minutes)', ms: 1000 },
        { value: '10s', label: '10 seconds', ms: 1000 },
        { value: '30s', label: '30 seconds', ms: 1000 },
        { value: '1m', label: '1 minute', ms: 1000 }
    ];

    const TIMEZONE_OPTIONS = [
        'Europe/Brussels',
        'Europe/Amsterdam',
        'Europe/London',
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Asia/Tokyo'
    ];

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const ClockWidget = ({ remove, settings, updateSettings, widgetId }) => {
        const cfg = { ...DEFAULT_WIDGET, ...settings };
        const [editMode, setEditMode] = useState(false);
        const [now, setNow] = useState(new Date());
        const bodyRef = useRef(null);
        const [bodySize, setBodySize] = useState({ width: 320, height: 220 });

        const refreshMs = useMemo(() => {
            const found = REFRESH_OPTIONS.find((o) => o.value === cfg.refreshInterval);
            return found ? found.ms : 1000;
        }, [cfg.refreshInterval]);

        useEffect(() => {
            const timer = setInterval(() => setNow(new Date()), refreshMs);
            return () => clearInterval(timer);
        }, [refreshMs]);

        useEffect(() => {
            if (!bodyRef.current) {
                return;
            }

            const element = bodyRef.current;
            const updateSize = () => {
                const rect = element.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setBodySize({ width: rect.width, height: rect.height });
                }
            };

            updateSize();

            if (typeof ResizeObserver === 'undefined') {
                window.addEventListener('resize', updateSize);
                return () => window.removeEventListener('resize', updateSize);
            }

            const observer = new ResizeObserver(updateSize);
            observer.observe(element);
            return () => observer.disconnect();
        }, []);

        const timezone = cfg.timeType === 'local'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : cfg.timezone;

        const hour12 = cfg.hourFormat === '12';

        const timeOptions = {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12
        };

        if (cfg.showSeconds) {
            timeOptions.second = '2-digit';
        }

        const timeStr = new Intl.DateTimeFormat([], timeOptions).format(now);
        const dateStr = new Intl.DateTimeFormat([], {
            timeZone: timezone,
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(now);

        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(now).reduce((acc, part) => {
            acc[part.type] = part.value;
            return acc;
        }, {});

        const h = Number(parts.hour || 0);
        const m = Number(parts.minute || 0);
        const s = Number(parts.second || 0);

        const analogBaseSize = clamp(Math.min(bodySize.width - 30, bodySize.height - 54), 84, 560);
        const analogSize = Math.round(analogBaseSize * 0.8);
        const digitalTimeSize = Math.round(clamp(Math.min(bodySize.width * 0.2, bodySize.height * 0.35), 20, 100));
        const dateSize = Math.round(clamp(digitalTimeSize * 0.28 * (cfg.dateSize / 100), 9, 42));

        const setSafeShow = (key, checked) => {
            if (!checked) {
                const activeCount = [cfg.showDate, cfg.showTime, cfg.showTimezone].filter(Boolean).length;
                if (activeCount <= 1) {
                    return;
                }
            }
            updateSettings({ [key]: checked });
        };

        const faceStyle = { '--clock-size': `${analogSize}px` };
        const viewStyle = {
            '--clock-time-size': `${digitalTimeSize}px`,
            '--clock-date-size': `${dateSize}px`,
            '--clock-time-weight': cfg.timeBold ? 700 : 500,
            '--clock-time-color': cfg.background === 'dark' ? '#f5f8fb' : 'var(--text-color)',
            background: cfg.background === 'dark' ? '#1f252b' : 'transparent'
        };

        const renderAnalog = () => (
            <div className="clock-view" style={viewStyle}>
                <div className="clock-face" style={faceStyle}>
                    {[...Array(12)].map((_, i) => {
                        const angle = i * 30;
                        const tx = Math.sin(angle * Math.PI / 180) * analogSize * 0.44;
                        const ty = -Math.cos(angle * Math.PI / 180) * analogSize * 0.44;
                        return (
                            <div
                                key={`tick-${i}`}
                                className={`clock-tick ${i % 3 === 0 ? 'major' : ''}`}
                                style={{ transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${angle}deg)` }}
                            />
                        );
                    })}
                    {[...Array(12)].map((_, i) => {
                        const angle = i * 30;
                        const nx = Math.sin(angle * Math.PI / 180) * analogSize * 0.34;
                        const ny = -Math.cos(angle * Math.PI / 180) * analogSize * 0.34;
                        return (
                            <div
                                key={`num-${i}`}
                                className="clock-number"
                                style={{ transform: `translate(${nx}px, ${ny}px)` }}
                            >
                                {i === 0 ? 12 : i}
                            </div>
                        );
                    })}
                    <div className="clock-hand hour" style={{ transform: `translateX(-50%) rotate(${(h % 12) * 30 + m * 0.5}deg)` }} />
                    <div className="clock-hand min" style={{ transform: `translateX(-50%) rotate(${m * 6 + s * 0.1}deg)` }} />
                    {cfg.showSeconds && <div className="clock-hand sec" style={{ transform: `translateX(-50%) rotate(${s * 6}deg)` }} />}
                    <div className="clock-center" />
                </div>

                {cfg.showDate && <div className="clock-date">{dateStr}</div>}
                {cfg.showTimezone && <div className="clock-timezone">{timezone}</div>}
                {!cfg.showTime && cfg.showDate === false && cfg.showTimezone === false && <div className="clock-time">{timeStr}</div>}
            </div>
        );

        const renderDigital = () => (
            <div className="clock-view" style={viewStyle}>
                {cfg.showTime && <div className="clock-time">{timeStr}</div>}
                {cfg.showDate && <div className="clock-date">{dateStr}</div>}
                {cfg.showTimezone && <div className="clock-timezone">{timezone}</div>}
            </div>
        );

        return (
            <div className="widget-card">
                {cfg.showHeader && (
                    <div className="widget-header">
                        <span className="widget-title">{cfg.name || 'default'}</span>
                        <div className="widget-actions">
                            <button className="btn-zbx" onClick={() => setEditMode((v) => !v)}>
                                {editMode ? 'Close' : 'Edit'}
                            </button>
                            <button className="btn-zbx btn-danger" onClick={remove}>✕</button>
                        </div>
                    </div>
                )}

                <div className="widget-body" ref={bodyRef}>
                    {!cfg.showHeader && (
                        <div className="widget-floating-actions">
                            <button className="btn-zbx" onClick={() => setEditMode((v) => !v)}>
                                {editMode ? 'Close' : 'Edit'}
                            </button>
                            <button className="btn-zbx btn-danger" onClick={remove}>✕</button>
                        </div>
                    )}

                    {editMode ? (
                        <div className="clock-editor">
                            <div className="editor-title">Clock</div>
                            <div className="editor-grid">
                                <div className="editor-label">Name</div>
                                <div className="editor-control">
                                    <input
                                        type="text"
                                        value={cfg.name}
                                        onChange={(e) => updateSettings({ name: e.target.value })}
                                        placeholder="default"
                                    />
                                </div>

                                <div className="editor-label">Show header</div>
                                <div className="editor-control">
                                    <label><input type="checkbox" checked={cfg.showHeader} onChange={(e) => updateSettings({ showHeader: e.target.checked })} /> Header</label>
                                </div>

                                <div className="editor-label">Refresh interval</div>
                                <div className="editor-control">
                                    <select value={cfg.refreshInterval} onChange={(e) => updateSettings({ refreshInterval: e.target.value })}>
                                        {REFRESH_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>

                                <div className="editor-label">Time type</div>
                                <div className="editor-control">
                                    <select value={cfg.timeType} onChange={(e) => updateSettings({ timeType: e.target.value })}>
                                        <option value="local">Local time</option>
                                        <option value="custom">Custom time zone</option>
                                    </select>
                                </div>

                                {cfg.timeType === 'custom' && (
                                    <>
                                        <div className="editor-label">Time zone</div>
                                        <div className="editor-control">
                                            <select value={cfg.timezone} onChange={(e) => updateSettings({ timezone: e.target.value })}>
                                                {TIMEZONE_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div className="editor-label">Clock type</div>
                                <div className="editor-control">
                                    <div className="editor-segment">
                                        <button className={cfg.clockType === 'analog' ? 'active' : ''} onClick={() => updateSettings({ clockType: 'analog' })}>Analog</button>
                                        <button className={cfg.clockType === 'digital' ? 'active' : ''} onClick={() => updateSettings({ clockType: 'digital' })}>Digital</button>
                                    </div>
                                </div>

                                <div className="editor-label">Show</div>
                                <div className="editor-control editor-checks">
                                    <label>
                                        <input type="checkbox" checked={cfg.showDate} onChange={(e) => setSafeShow('showDate', e.target.checked)} /> Date
                                    </label>
                                    <label>
                                        <input type="checkbox" checked={cfg.showTime} onChange={(e) => setSafeShow('showTime', e.target.checked)} /> Time
                                    </label>
                                    <label>
                                        <input type="checkbox" checked={cfg.showTimezone} onChange={(e) => setSafeShow('showTimezone', e.target.checked)} /> Time zone
                                    </label>
                                </div>
                            </div>

                            <div className="editor-advanced">
                                <div className="editor-advanced-title">Advanced configuration</div>
                                <div className="editor-grid">
                                    <div className="editor-label">Background colour</div>
                                    <div className="editor-control">
                                        <div className="editor-segment">
                                            <button className={cfg.background === 'theme' ? 'active' : ''} onClick={() => updateSettings({ background: 'theme' })}>Theme</button>
                                            <button className={cfg.background === 'dark' ? 'active' : ''} onClick={() => updateSettings({ background: 'dark' })}>Dark</button>
                                        </div>
                                    </div>

                                    <div className="editor-label">Time style</div>
                                    <div className="editor-control editor-checks">
                                        <label>
                                            <input type="checkbox" checked={cfg.timeBold} onChange={(e) => updateSettings({ timeBold: e.target.checked })} /> Bold
                                        </label>
                                        <label>
                                            <input type="checkbox" checked={cfg.showSeconds} onChange={(e) => updateSettings({ showSeconds: e.target.checked })} /> Seconds
                                        </label>
                                    </div>

                                    <div className="editor-label">Time format</div>
                                    <div className="editor-control">
                                        <div className="editor-segment">
                                            <button className={cfg.hourFormat === '24' ? 'active' : ''} onClick={() => updateSettings({ hourFormat: '24' })}>24-hour</button>
                                            <button className={cfg.hourFormat === '12' ? 'active' : ''} onClick={() => updateSettings({ hourFormat: '12' })}>12-hour</button>
                                        </div>
                                    </div>

                                    <div className="editor-label">Date size (%)</div>
                                    <div className="editor-control">
                                        <input
                                            type="number"
                                            min="60"
                                            max="220"
                                            value={cfg.dateSize}
                                            onChange={(e) => updateSettings({ dateSize: clamp(Number(e.target.value) || 100, 60, 220) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="editor-footer">
                                <button className="btn-zbx" onClick={() => setEditMode(false)}>Done</button>
                            </div>
                        </div>
                    ) : (
                        cfg.clockType === 'analog' ? renderAnalog() : renderDigital()
                    )}
                </div>
            </div>
        );
    };

    const TIMESTATE_DEFAULT_WIDGET = {
        type: 'TimeState',
        name: 'Time State',
        showHeader: true,
        groupid: '',
        hostidsCsv: '',
        filterMode: 'key',
        itemFilter: '',
        rowSort: 0,
        rowGroupMode: 0,
        rowGroupCollapsed: 0,
        refreshSec: 30,
        timeAxisTickSec: 0,
        timeAxisLabelDensity: 2,
        showGridLines: true,
        legendMode: 'list',
        legendShowCount: true,
        legendShowDuration: true,
        showSegmentLabels: false,
        datasetsJson: '',
        stateMap: 'value:1=OK|#2E7D32,value:0=Problem|#C62828'
    };

    const widgetDefaultsByType = (type) => {
        if (type === 'TimeState') {
            return TIMESTATE_DEFAULT_WIDGET;
        }
        return DEFAULT_WIDGET;
    };

    const toBoundedInt = (value, fallback, min, max) => {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return fallback;
        }
        return Math.max(min, Math.min(max, Math.round(num)));
    };

    const toBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
    const toText = (value, fallback, maxLength = 120) => {
        if (typeof value !== 'string') {
            return fallback;
        }
        return value.slice(0, maxLength);
    };
    const toId = (value, fallback = '') => (/^\d+$/.test(String(value || '').trim()) ? String(value).trim() : fallback);
    const toIdsCsv = (value) => Array.from(new Set(
        String(value || '')
            .split(/[\s,]+/)
            .map((entry) => entry.trim())
            .filter((entry) => /^\d+$/.test(entry))
    )).join(',');
    const sanitizeWidgetKey = (value, fallback) => {
        const raw = String(value || '').trim();
        if (/^[A-Za-z0-9_-]{1,80}$/.test(raw)) {
            return raw;
        }
        return fallback;
    };
    const sanitizeDatasetsJson = (value) => {
        if (typeof value !== 'string') {
            return '';
        }
        const raw = value.trim();
        if (raw === '') {
            return '';
        }
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return '';
            }
            return JSON.stringify(parsed.slice(0, 20));
        }
        catch (_err) {
            return '';
        }
    };

    const mergeWithDefaults = (widget, fallbackId) => {
        const source = (widget && typeof widget === 'object') ? widget : {};
        const type = source.type === 'TimeState' ? 'TimeState' : 'Clock';
        const defaults = widgetDefaultsByType(type);
        const base = { ...defaults, ...source, type };
        const safe = {
            ...base,
            i: sanitizeWidgetKey(base.i, fallbackId),
            x: toBoundedInt(base.x, 0, 0, 5000),
            y: toBoundedInt(base.y, 0, 0, 20000),
            w: toBoundedInt(base.w, type === 'TimeState' ? 8 : 4, 1, 36),
            h: toBoundedInt(base.h, type === 'TimeState' ? 10 : 8, 1, 200),
            name: toText(base.name, defaults.name, 120),
            showHeader: toBoolean(base.showHeader, defaults.showHeader)
        };

        if (type === 'TimeState') {
            safe.groupid = toId(base.groupid, '');
            safe.hostidsCsv = toIdsCsv(base.hostidsCsv);
            safe.filterMode = base.filterMode === 'name' ? 'name' : 'key';
            safe.itemFilter = toText(base.itemFilter, '', 255);
            safe.rowSort = toBoundedInt(base.rowSort, 0, 0, 2);
            safe.rowGroupMode = toBoundedInt(base.rowGroupMode, 0, 0, 2);
            safe.rowGroupCollapsed = toBoundedInt(base.rowGroupCollapsed, 0, 0, 1);
            safe.refreshSec = toBoundedInt(base.refreshSec, 30, 5, 3600);
            safe.timeAxisTickSec = toBoundedInt(base.timeAxisTickSec, 0, 0, 86400);
            safe.timeAxisLabelDensity = toBoundedInt(base.timeAxisLabelDensity, 2, 1, 3);
            safe.showGridLines = toBoolean(base.showGridLines, true);
            safe.legendMode = ['none', 'list', 'table'].includes(base.legendMode) ? base.legendMode : 'list';
            safe.legendShowCount = toBoolean(base.legendShowCount, true);
            safe.legendShowDuration = toBoolean(base.legendShowDuration, true);
            safe.showSegmentLabels = toBoolean(base.showSegmentLabels, false);
            safe.stateMap = toText(base.stateMap, TIMESTATE_DEFAULT_WIDGET.stateMap, 2048);
            safe.datasetsJson = sanitizeDatasetsJson(base.datasetsJson);
            return safe;
        }

        const allowedRefresh = new Set(REFRESH_OPTIONS.map((option) => option.value));
        const allowedTimezone = new Set(TIMEZONE_OPTIONS);
        safe.refreshInterval = allowedRefresh.has(base.refreshInterval) ? base.refreshInterval : DEFAULT_WIDGET.refreshInterval;
        safe.timeType = base.timeType === 'custom' ? 'custom' : 'local';
        safe.clockType = base.clockType === 'digital' ? 'digital' : 'analog';
        safe.showDate = toBoolean(base.showDate, DEFAULT_WIDGET.showDate);
        safe.showTime = toBoolean(base.showTime, DEFAULT_WIDGET.showTime);
        safe.showTimezone = toBoolean(base.showTimezone, DEFAULT_WIDGET.showTimezone);
        safe.background = base.background === 'dark' ? 'dark' : 'theme';
        safe.timeBold = toBoolean(base.timeBold, DEFAULT_WIDGET.timeBold);
        safe.showSeconds = toBoolean(base.showSeconds, DEFAULT_WIDGET.showSeconds);
        safe.hourFormat = base.hourFormat === '12' ? '12' : '24';
        safe.dateSize = toBoundedInt(base.dateSize, DEFAULT_WIDGET.dateSize, 60, 220);
        safe.timezone = allowedTimezone.has(base.timezone) ? base.timezone : DEFAULT_WIDGET.timezone;
        return safe;
    };

    const sanitizeLayout = (items) => {
        if (!Array.isArray(items)) {
            return [];
        }
        const seenKeys = new Set();

        return items
            .slice(0, 60)
            .filter((item) => item && typeof item === 'object')
            .map((item, index) => {
                const merged = mergeWithDefaults(item, `w${index + 1}`);
                let key = merged.i;
                if (seenKeys.has(key)) {
                    let suffix = 2;
                    while (seenKeys.has(`${key}_${suffix}`)) {
                        suffix += 1;
                    }
                    key = `${key}_${suffix}`;
                }
                seenKeys.add(key);
                return { ...merged, i: key };
            });
    };

    const saveLayoutLocal = (items) => {
        const safeItems = sanitizeLayout(items);
        localStorage.setItem('zbx_layout_v4', JSON.stringify(safeItems));
        return safeItems;
    };

    const createWidgetId = (existingIds) => {
        let id = '';
        do {
            id = `w${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        } while (existingIds.has(id));
        return id;
    };

    const App = () => {
        const gridWrapRef = useRef(null);
        const addWidgetMenuRef = useRef(null);
        const [gridWidth, setGridWidth] = useState(() => {
            const root = document.getElementById('react-root');
            if (root) {
                const width = Math.floor(root.getBoundingClientRect().width);
                if (width > 0) {
                    return width;
                }
            }
            return 1400;
        });
        const apiClient = useMemo(() => createDashboardApiClient(window.ZABBIX_CONFIG || {}), []);
        const [globalData, setGlobalData] = useState({ groups: [], refreshedAt: 0 });
        const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
        const [layout, setLayout] = useState(() => {
            const fallbackLayout = [
                mergeWithDefaults({ i: 'w1', x: 0, y: 0, w: 4, h: 8, ...DEFAULT_WIDGET }, 'w1'),
                mergeWithDefaults({ i: 'w2', x: 4, y: 0, w: 8, h: 10, ...TIMESTATE_DEFAULT_WIDGET }, 'w2')
            ];

            const saved = localStorage.getItem('zbx_layout_v4');
            if (!saved) {
                return fallbackLayout;
            }

            try {
                const parsed = JSON.parse(saved);
                const sanitized = sanitizeLayout(parsed);
                return sanitized.length > 0 ? sanitized : fallbackLayout;
            }
            catch (_err) {
                return fallbackLayout;
            }
        });

        const mergeGridLayoutWithWidgets = useCallback((widgets, gridItems) => {
            return gridItems.map((item) => {
                const old = widgets.find((w) => w.i === item.i) || { type: 'Clock', i: item.i };
                return mergeWithDefaults({ ...old, ...item }, old.i || item.i || 'w1');
            });
        }, []);

        const hasSameGridGeometry = useCallback((left, right) => {
            if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
                return false;
            }
            const rightById = new Map(right.map((item) => [item.i, item]));
            for (const item of left) {
                const other = rightById.get(item.i);
                if (!other) {
                    return false;
                }
                if (item.x !== other.x || item.y !== other.y || item.w !== other.w || item.h !== other.h) {
                    return false;
                }
            }
            return true;
        }, []);

        const onLayoutChange = useCallback((newLayout) => {
            // Keep controlled layout in sync, but don't persist automatic compaction/reflow events.
            setLayout((prev) => {
                const merged = mergeGridLayoutWithWidgets(prev, newLayout);
                return hasSameGridGeometry(prev, merged) ? prev : merged;
            });
        }, [mergeGridLayoutWithWidgets, hasSameGridGeometry]);

        const persistGridLayout = useCallback((newLayout) => {
            setLayout((prev) => {
                const merged = mergeGridLayoutWithWidgets(prev, newLayout);
                if (hasSameGridGeometry(prev, merged)) {
                    return prev;
                }
                return saveLayoutLocal(merged);
            });
        }, [mergeGridLayoutWithWidgets, hasSameGridGeometry]);

        const onDragStop = useCallback((newLayout) => {
            persistGridLayout(newLayout);
        }, [persistGridLayout]);

        const onResizeStop = useCallback((newLayout) => {
            persistGridLayout(newLayout);
        }, [persistGridLayout]);

        const updateWidget = (id, patch) => {
            setLayout((prev) => {
                const next = prev.map((w) => (w.i === id ? mergeWithDefaults({ ...w, ...patch }, w.i) : w));
                return saveLayoutLocal(next);
            });
        };

        const refreshAllData = useCallback(async () => {
            try {
                const groups = await apiClient.cachedRequest({ action_type: 'get_groups' }, 60000);
                setGlobalData({
                    groups: Array.isArray(groups) ? groups : [],
                    refreshedAt: Date.now()
                });
            }
            catch (_error) {
                setGlobalData((prev) => ({ ...prev, refreshedAt: Date.now() }));
            }
        }, [apiClient]);

        const removeWidget = (id) => {
            setLayout((prev) => {
                const next = prev.filter((w) => w.i !== id);
                return saveLayoutLocal(next);
            });
        };

        const addWidget = (type) => {
            const defaults = widgetDefaultsByType(type);
            setLayout((prev) => {
                const existingIds = new Set(prev.map((item) => String(item.i || '')));
                const widgetId = createWidgetId(existingIds);
                const next = [
                    ...prev,
                    mergeWithDefaults({
                        i: widgetId,
                        x: 0,
                        y: Infinity,
                        w: type === 'TimeState' ? 8 : 4,
                        h: type === 'TimeState' ? 10 : 8,
                        ...defaults
                    }, widgetId)
                ];
                return saveLayoutLocal(next);
            });
        };

        useEffect(() => {
            const updateGridWidth = () => {
                if (!gridWrapRef.current) {
                    return;
                }
                const rect = gridWrapRef.current.getBoundingClientRect();
                if (rect.width > 0) {
                    setGridWidth(Math.floor(rect.width));
                }
            };

            updateGridWidth();

            if (typeof ResizeObserver === 'undefined') {
                window.addEventListener('resize', updateGridWidth);
                return () => window.removeEventListener('resize', updateGridWidth);
            }

            const observer = new ResizeObserver(updateGridWidth);
            observer.observe(gridWrapRef.current);
            return () => observer.disconnect();
        }, []);

        useEffect(() => {
            refreshAllData();
            const timer = setInterval(refreshAllData, 60000);
            return () => clearInterval(timer);
        }, [refreshAllData]);

        useEffect(() => {
            const onDocumentMouseDown = (event) => {
                if (!addWidgetMenuRef.current) {
                    return;
                }
                if (!addWidgetMenuRef.current.contains(event.target)) {
                    setIsAddMenuOpen(false);
                }
            };
            const onDocumentKeyDown = (event) => {
                if (event.key === 'Escape') {
                    setIsAddMenuOpen(false);
                }
            };

            document.addEventListener('mousedown', onDocumentMouseDown);
            document.addEventListener('keydown', onDocumentKeyDown);
            return () => {
                document.removeEventListener('mousedown', onDocumentMouseDown);
                document.removeEventListener('keydown', onDocumentKeyDown);
            };
        }, []);

        const gridCols = gridWidth >= 1600 ? 36 : (gridWidth >= 1200 ? 24 : 12);
        const refreshedAtLabel = globalData.refreshedAt > 0
            ? new Date(globalData.refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '--:--:--';

        const normalizedLayout = useMemo(() => (
            layout.map((item) => {
                const safeW = Math.max(1, Math.min(item.w || 1, gridCols));
                const maxX = Math.max(0, gridCols - safeW);
                const safeX = Math.max(0, Math.min(item.x || 0, maxX));
                return { ...item, w: safeW, x: safeX };
            })
        ), [layout, gridCols]);

        return (
            <div className="dashboard-shell" ref={gridWrapRef}>
                <div className="dashboard-topbar">
                    <div className="dashboard-title-block">
                        <h1 className="dashboard-title">React Dashboard</h1>
                        <div className="dashboard-meta">
                            {`${layout.length} widgets | ${globalData.groups.length} groups | refreshed ${refreshedAtLabel}`}
                        </div>
                    </div>

                    <div className="dashboard-actions" ref={addWidgetMenuRef}>
                        <button
                            className="btn-add-widget"
                            type="button"
                            onClick={() => setIsAddMenuOpen((open) => !open)}
                            aria-haspopup="menu"
                            aria-expanded={isAddMenuOpen ? 'true' : 'false'}
                        >
                            + Add widget
                        </button>
                        {isAddMenuOpen && (
                            <div className="add-widget-menu" role="menu">
                                <button
                                    type="button"
                                    className="add-widget-item"
                                    onClick={() => {
                                        addWidget('Clock');
                                        setIsAddMenuOpen(false);
                                    }}
                                >
                                    Clock widget
                                </button>
                                <button
                                    type="button"
                                    className="add-widget-item"
                                    onClick={() => {
                                        addWidget('TimeState');
                                        setIsAddMenuOpen(false);
                                    }}
                                >
                                    Time state widget
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="dashboard-grid-host">
                    <GridLayout
                        className="layout"
                        layout={normalizedLayout}
                        cols={gridCols}
                        rowHeight={30}
                        width={gridWidth}
                        compactType={null}
                        draggableHandle=".widget-header"
                        onLayoutChange={onLayoutChange}
                        onDragStop={onDragStop}
                        onResizeStop={onResizeStop}
                    >
                        {layout.map((w) => (
                            (() => {
                                const WidgetComponent = (w.type === 'TimeState' && window.TimeStateWidget)
                                    ? window.TimeStateWidget
                                    : ClockWidget;

                                return (
                                    <div key={w.i}>
                                        <WidgetComponent
                                            widgetId={w.i}
                                            settings={w}
                                            updateSettings={(patch) => updateWidget(w.i, patch)}
                                            remove={() => removeWidget(w.i)}
                                            apiClient={apiClient}
                                            globalData={globalData}
                                            refreshAllData={refreshAllData}
                                        />
                                    </div>
                                );
                            })()
                        ))}
                    </GridLayout>
                </div>
            </div>
        );
    };

    const root = ReactDOM.createRoot(document.getElementById('react-root'));
    root.render(<App />);
</script>
