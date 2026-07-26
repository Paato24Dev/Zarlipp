#!/usr/bin/env python3
"""
Genera las texturas PNG del mod sin dependencias externas (solo stdlib).

Las texturas de item y del bloque compacto se dibujan como "mapas ASCII":
cada letra es un color de la paleta. Asi puedes retocarlas a mano sin saber
de graficos: cambia las letras del dibujo y vuelve a ejecutar el script.

    .  transparente      D  cian oscuro
    L  cian claro        S  brillo (casi blanco)
    M  cian medio        W  madera clara
                         w  madera oscura

Uso:  python3 tools/generate_textures.py
"""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEX = ROOT / "src/main/resources/assets/zarlippita/textures"
ICON = ROOT / "src/main/resources/assets/zarlippita/icon.png"

# --- Paleta ---
EMPTY = (0, 0, 0, 0)
GEM_DARK = (14, 74, 92, 255)
GEM_MID = (32, 156, 178, 255)
GEM_LIGHT = (94, 226, 236, 255)
GEM_SHINE = (208, 252, 255, 255)
WOOD_MID = (140, 106, 62, 255)
WOOD_DARK = (95, 70, 40, 255)

STONE_DARK = (94, 94, 94, 255)
STONE_MID = (128, 128, 128, 255)
STONE_LIGHT = (152, 152, 152, 255)

PALETTE = {
    ".": EMPTY,
    "D": GEM_DARK,
    "M": GEM_MID,
    "L": GEM_LIGHT,
    "S": GEM_SHINE,
    "W": WOOD_MID,
    "w": WOOD_DARK,
}


def write_png(path: Path, pixels):
    """Escribe una matriz de tuplas RGBA como PNG."""
    height = len(pixels)
    width = len(pixels[0])

    raw = b""
    for row in pixels:
        raw += b"\x00"  # filtro 'None' al inicio de cada scanline
        for r, g, b, a in row:
            raw += bytes((r, g, b, a))

    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)
    print(f"  {path.relative_to(ROOT)}  ({width}x{height})")


def from_ascii(art):
    """Convierte una lista de 16 cadenas de 16 caracteres en pixeles RGBA."""
    assert len(art) == 16, f"se esperaban 16 filas, hay {len(art)}"
    for i, row in enumerate(art):
        assert len(row) == 16, f"la fila {i} tiene {len(row)} caracteres, deben ser 16"
    return [[PALETTE[c] for c in row] for row in art]


def scale(pixels, factor):
    """Agranda la imagen repitiendo pixeles (nearest neighbour)."""
    out = []
    for row in pixels:
        big = []
        for px in row:
            big.extend([px] * factor)
        out.extend([big] * factor)
    return out


# ---------------------------------------------------------------- dibujos

# Pico: cabeza curva arriba, mango en diagonal hacia abajo-izquierda.
PICKAXE = [
    "................",
    "....LLLLLLLL....",
    "..LLSSMMMMMMLL..",
    ".LMMSMMMMMMMMML.",
    ".LMMMMDDDDMMMMD.",
    ".DMMD.....DMMMD.",
    "..DD..WW...DDD..",
    "......WWw.......",
    ".....WWw........",
    "....WWw.........",
    "...WWw..........",
    "..WWw...........",
    ".WWw............",
    ".Ww.............",
    "................",
    "................",
]

# Gema: rombo con facetas y un brillo arriba a la izquierda.
GEM = [
    "................",
    "................",
    "......DDDD......",
    ".....DMMMMD.....",
    "....DMSSMMMD....",
    "...DMSSLMMMMD...",
    "..DMMSLLMMMMMD..",
    "..DMMLLMMMMMMD..",
    "..DMMMMMMMMMMD..",
    "...DMMMMMMMMD...",
    "....DMMMMMMD....",
    ".....DMMMMD.....",
    "......DMMD......",
    ".......DD.......",
    "................",
    "................",
]

# Bloque compacto: cuatro gemas engastadas con bisel.
BLOCK = [
    "LLLLLLLLLLLLLLLL",
    "LMMMMMMDLMMMMMML",
    "LMSLMMMDLMSLMMML",
    "LMLLMMMDLMLLMMML",
    "LMMMMMMDLMMMMMML",
    "LMMMMMMDLMMMMMML",
    "LMMMMMMDLMMMMMML",
    "LDDDDDDDLDDDDDDL",
    "LLLLLLLLLLLLLLLL",
    "LMMMMMMDLMMMMMML",
    "LMSLMMMDLMSLMMML",
    "LMLLMMMDLMLLMMML",
    "LMMMMMMDLMMMMMML",
    "LMMMMMMDLMMMMMML",
    "LMMMMMMDLMMMMMMD",
    "DDDDDDDDDDDDDDDD",
]


def ore_texture():
    """Mena: fondo de piedra moteado + cristales de zarlippita."""
    grid = [[STONE_MID for _ in range(16)] for _ in range(16)]

    # Moteado deterministico (sin random, para que sea reproducible).
    for y in range(16):
        for x in range(16):
            n = (x * 7 + y * 13 + (x * y) % 5) % 11
            if n < 2:
                grid[y][x] = STONE_DARK
            elif n > 8:
                grid[y][x] = STONE_LIGHT

    # Cuatro cristales en forma de rombo.
    for cx, cy in ((4, 4), (11, 6), (6, 11), (12, 12)):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                x, y = cx + dx, cy + dy
                if not (0 <= x < 16 and 0 <= y < 16):
                    continue
                dist = abs(dx) + abs(dy)
                grid[y][x] = GEM_LIGHT if dist == 0 else (GEM_MID if dist == 1 else GEM_DARK)
        if 0 <= cy - 1 < 16 and 0 <= cx - 1 < 16:
            grid[cy - 1][cx - 1] = GEM_SHINE

    return grid


def main():
    print("Generando texturas de Zarlippita...")
    gem = from_ascii(GEM)

    write_png(TEX / "block/zarlippite_ore.png", ore_texture())
    write_png(TEX / "block/zarlippite_block.png", from_ascii(BLOCK))
    write_png(TEX / "item/zarlippite.png", gem)
    write_png(TEX / "item/zarlippite_pickaxe.png", from_ascii(PICKAXE))

    # Icono del mod (el que se ve en la lista de mods): la gema a 64x64.
    write_png(ICON, scale(gem, 4))

    print("Listo.")


if __name__ == "__main__":
    main()
