// src/components/accessibility/AccessibilityPanel.tsx
// ─── Mejoras respecto al original ───────────────────────────────────────────
//
//  1. Muestra el tema efectivo actual ("Sistema → Oscuro") en tiempo real.
//  2. Preview visual de cada opción de tema (swatch).
//  3. Indicador de "tema activo" en el botón flotante (icono sol/luna).
//  4. Sección "Información" describe brevemente qué hace cada opción.
//  5. Usa `resolvedTheme` del contexto para feedback inmediato.

import { useState } from "react";
import {
    Button,
    Drawer,
    Radio,
    Switch,
    Divider,
    Space,
    Typography,
    Tag,
} from "antd";
import {
    EyeOutlined,
    FontSizeOutlined,
    BgColorsOutlined,
    UndoOutlined,
    SettingOutlined,
    BulbOutlined,
    SunOutlined,
    MoonOutlined,
    DesktopOutlined,
} from "@ant-design/icons";
import { useAccessibility } from "../../context/AccessibilityContext";

const { Text, Title } = Typography;

// ────────────────────────────────────────────────────────────────────────────
// Helpers visuales
// ────────────────────────────────────────────────────────────────────────────

/** Mini swatch de 2 colores para previsualizar un tema */
function ThemeSwatch({ bg, text }: { bg: string; text: string }) {
    return (
        <span
            className="inline-flex items-center justify-center rounded text-[10px] font-bold leading-none px-1.5 py-0.5 shrink-0"
            style={{ background: bg, color: text, fontFamily: "monospace" }}
        >
            Aa
        </span>
    );
}

const THEME_OPTIONS = [
    {
        value: "light",
        label: "Modo claro",
        icon: <SunOutlined />,
        swatch: { bg: "#ffffff", text: "#0f172a" },
        description: "Fondo blanco, texto oscuro.",
    },
    {
        value: "dark",
        label: "Modo oscuro",
        icon: <MoonOutlined />,
        swatch: { bg: "#0f172a", text: "#f8fafc" },
        description: "Reduce la fatiga visual en entornos con poca luz.",
    },
    {
        value: "system",
        label: "Seguir al sistema",
        icon: <DesktopOutlined />,
        swatch: { bg: "#6366f1", text: "#ffffff" },
        description: "Cambia automáticamente según la preferencia del dispositivo.",
    },
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────────────────────

export default function AccessibilityPanel() {
    const [open, setOpen] = useState(false);
    const { settings, resolvedTheme, setSetting, resetSettings } = useAccessibility();

    // Ícono del botón flotante refleja el tema actual
    const FloatIcon = resolvedTheme === "dark" ? MoonOutlined : SunOutlined;

    return (
        <>
            {/* ── Botón flotante ── */}
            <Button
                type="primary"
                shape="circle"
                size="large"
                icon={<FloatIcon />}
                onClick={() => setOpen(true)}
                aria-label="Abrir opciones de accesibilidad"
                title="Accesibilidad"
                style={{
                    position: "fixed",
                    right: 24,
                    bottom: 24,
                    zIndex: 3000,
                    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.25)",
                }}
            />

            {/* ── Panel lateral ── */}
            <Drawer
                title={
                    <Space>
                        <SettingOutlined />
                        Accesibilidad
                        {/* Indicador del tema activo */}
                        <Tag
                            color={resolvedTheme === "dark" ? "blue" : "orange"}
                            style={{ marginLeft: 4, fontSize: 11 }}
                        >
                            {settings.themeMode === "system" && " (sistema)"}
                        </Tag>
                    </Space>
                }
                open={open}
                onClose={() => setOpen(false)}
                width={400}
                destroyOnClose={false}
            >
                <div className="space-y-5">

                    {/* ── Apariencia ── */}
                    <div>
                        <Title level={5}>
                            <BulbOutlined /> Apariencia
                        </Title>
                        <Radio.Group
                            value={settings.themeMode}
                            onChange={(e) => setSetting("themeMode", e.target.value)}
                            className="w-full"
                        >
                            <Space direction="vertical" className="w-full">
                                {THEME_OPTIONS.map((opt) => (
                                    <Radio key={opt.value} value={opt.value}>
                                        <span className="flex items-center gap-2">
                                            <ThemeSwatch {...opt.swatch} />
                                            <span>
                                                <span className="font-medium">
                                                    {opt.icon} {opt.label}
                                                </span>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {opt.description}
                                                </Text>
                                            </span>
                                        </span>
                                    </Radio>
                                ))}
                            </Space>
                        </Radio.Group>

                        {/* Tema efectivo cuando es "system" */}
                        {settings.themeMode === "system" && (
                            <div className="mt-2 text-xs text-slate-500 pl-1">
                                Tema activo ahora:{" "}
                            </div>
                        )}
                    </div>

                    <Divider />

                    {/* ── Tamaño de texto ── */}
                    <div>
                        <Title level={5}>
                            <FontSizeOutlined /> Tamaño de texto
                        </Title>
                        <Radio.Group
                            value={settings.fontSize}
                            onChange={(e) => setSetting("fontSize", e.target.value)}
                        >
                            <Space direction="vertical">
                                <Radio value="small">Pequeño</Radio>
                                <Radio value="normal">Normal</Radio>
                                <Radio value="large">Grande</Radio>
                                <Radio value="xlarge">Muy grande</Radio>
                            </Space>
                        </Radio.Group>
                    </div>

                    <Divider />

                    {/* ── Contraste ── */}
                    <div>
                        <Title level={5}>
                            <BgColorsOutlined /> Contraste
                        </Title>
                        <Radio.Group
                            value={settings.contrast}
                            onChange={(e) => setSetting("contrast", e.target.value)}
                        >
                            <Space direction="vertical">
                                <Radio value="normal">Normal</Radio>
                                <Radio value="high">
                                    Alto contraste{" "}
                                </Radio>
                            </Space>
                        </Radio.Group>
                    </div>

                    <Divider />

                    {/* ── Movimiento ── */}
                    <div>
                        <Title level={5}>Movimiento</Title>
                        <Radio.Group
                            value={settings.motion}
                            onChange={(e) => setSetting("motion", e.target.value)}
                        >
                            <Space direction="vertical">
                                <Radio value="normal">Animaciones normales</Radio>
                                <Radio value="reduced">
                                    Reducir animaciones{" "}
                                </Radio>
                            </Space>
                        </Radio.Group>
                    </div>

                    <Divider />

                    {/* ── Switches ── */}
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Text strong>Subrayar enlaces</Text>
                            <div className="text-xs text-slate-500">
                                Ayuda a distinguir textos clickeables.
                            </div>
                        </div>
                        <Switch
                            checked={settings.underlineLinks}
                            onChange={(checked) => setSetting("underlineLinks", checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Text strong>Mayor espaciado</Text>
                            <div className="text-xs text-slate-500">
                                Mejora la lectura de textos largos.
                            </div>
                        </div>
                        <Switch
                            checked={settings.readableSpacing}
                            onChange={(checked) => setSetting("readableSpacing", checked)}
                        />
                    </div>

                    <Divider />

                    <Button block icon={<UndoOutlined />} onClick={resetSettings}>
                        Restaurar configuración
                    </Button>
                </div>
            </Drawer>
        </>
    );
}