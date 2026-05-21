import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
// Importamos solo el motor 'slim' para mantener el paquete ligero
import { loadSlim } from "@tsparticles/slim";

export default function WaterBubblesBG() {
    const [init, setInit] = useState(false);

    // Esta configuración se ejecuta una sola vez para inicializar el motor
    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    // Configuración de las "burbujas" de Kanan
    const particlesOptions = {
        // Fondo blanco limpio
        background: {
            color: {
                value: "#ffffff",
            },
        },
        fpsLimit: 120,
        interactivity: {
            events: {
                // Al pasar el ratón, las burbujas se repelen (efecto hidrodinámico)
                onHover: {
                    enable: true,
                    mode: "repulse",
                },
                resize: true,
            },
            modes: {
                repulse: {
                    distance: 150, // Distancia de repulsión
                    duration: 0.4,
                },
            },
        },
        particles: {
            color: {
                value: "#a5f3fc", // Color cyan suave para el borde/reflejo
            },
            groups: {
                // Creamos dos grupos para dar profundidad visual (unas más opacas que otras)
                foreground: {
                    opacity: { value: { min: 0.3, max: 0.5 } },
                },
                background: {
                    opacity: { value: { min: 0.1, max: 0.2 } },
                },
            },
            // Efecto de brillo/reflejo en los bordes
            stroke: {
                width: 1,
                color: "#22d3ee",
            },
            move: {
                direction: "top", // Las burbujas suben lentamente
                enable: true,
                outModes: {
                    default: "out", // Reaparecen por abajo al salir por arriba
                },
                random: true, // Movimiento no lineal
                speed: { min: 0.5, max: 1.5 }, // Velocidad lenta y variable
                straight: false, // Drifting suave
            },
            number: {
                density: {
                    enable: true,
                    area: 800, // Densidad de partículas
                },
                value: 120, // Número total de burbujas
            },
            opacity: {
                // Opacidad base variable para efecto de profundidad
                value: { min: 0.1, max: 0.4 },
                animation: {
                    enable: true,
                    speed: 0.5,
                    sync: false, // Parpadeo suave e individual
                },
            },
            shape: {
                type: "circle", // Forma esférica
            },
            size: {
                // Tamaños variados (pequeñas gotas y burbujas medianas)
                value: { min: 2, max: 8 },
                animation: {
                    enable: true,
                    speed: 2,
                    sync: false, // Pulso suave e individual
                },
            },
        },
        detectRetina: true,
    };

    if (!init) return null; // Esperar a que el motor cargue

    return (
        <Particles
            id="tsparticles-kanan"
            className="absolute inset-0 z-0 animate-fade-in-slow"
            options={particlesOptions}
        />
    );
}