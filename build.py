"""Gera dist/ — a pasta para arrastar na Netlify.

A raiz do projeto é a fonte que você edita. dist/ é descartável: é apagada
e refeita a cada execução, então nunca fica dessincronizada da fonte.
Nunca edite nada dentro de dist/.

Uso:  python build.py        (ou clique duas vezes em build.cmd)
"""

import os
import re
import shutil
import sys
import urllib.parse

RAIZ = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(RAIZ, "dist")

PAGINAS = [
    "index.html",
    "404.html",
    "consultoria/index.html",
    "mentoria/index.html",
    "privacidade/index.html",
    "termos/index.html",
]
ARQUIVOS_SOLTOS = ["robots.txt", "sitemap.xml", "favicon.ico"]
PASTAS_ASSETS = ["assets/css", "assets/js", "assets/img", "assets/opt"]

# Headers e redirects aplicados pela Netlify também no deploy por arrastar,
# desde que este arquivo esteja na raiz da pasta enviada.
NETLIFY_TOML = """# Gerado por build.py — não edite aqui, edite netlify.toml na raiz do projeto.

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"

[[headers]]
  for = "/assets/js/*"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "/assets/css/*"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "/assets/opt/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/assets/img/*"
  [headers.values]
    Cache-Control = "public, max-age=604800"
"""


def limpar():
    """Esvazia dist/ sem apagar a própria pasta.

    No Windows, ter a dist/ aberta no Explorador (justamente o que você faz
    para arrastá-la) mantém um handle na pasta e faz rmtree falhar. Apagar
    só o conteúdo funciona mesmo com a janela aberta.
    """
    if not os.path.exists(DIST):
        os.makedirs(DIST)
        return
    for nome in os.listdir(DIST):
        alvo = os.path.join(DIST, nome)
        try:
            if os.path.isdir(alvo) and not os.path.islink(alvo):
                shutil.rmtree(alvo)
            else:
                os.remove(alvo)
        except PermissionError:
            sys.exit(
                "ERRO: '%s' está aberto por outro programa.\n"
                "Feche o arquivo (editor, visualizador ou servidor local) e rode de novo."
                % nome
            )


def copiar():
    limpar()

    for p in PAGINAS + ARQUIVOS_SOLTOS:
        destino = os.path.join(DIST, p)
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        shutil.copy2(os.path.join(RAIZ, p), destino)

    for pasta in PASTAS_ASSETS:
        shutil.copytree(os.path.join(RAIZ, pasta), os.path.join(DIST, pasta))

    with open(os.path.join(DIST, "netlify.toml"), "w", encoding="utf-8") as f:
        f.write(NETLIFY_TOML)


def verificar():
    """Confere que todo asset citado no HTML existe dentro de dist/."""
    faltando = []
    for p in PAGINAS:
        html = open(os.path.join(DIST, p), encoding="utf-8").read()
        refs = set(re.findall(r'(?:src|href)="(/assets/[^"]+)"', html))
        for m in re.findall(r'(?:srcset|imagesrcset)="([^"]+)"', html):
            for parte in m.split(","):
                u = parte.strip().split(" ")[0]
                if u.startswith("/assets"):
                    refs.add(u)
        for r in refs:
            rel = urllib.parse.unquote(r.split("?")[0]).lstrip("/")
            if not os.path.exists(os.path.join(DIST, rel)):
                faltando.append("%s -> %s" % (p, r))
    return faltando


def tamanho(caminho):
    total = 0
    for base, _, arquivos in os.walk(caminho):
        for a in arquivos:
            total += os.path.getsize(os.path.join(base, a))
    return total


if __name__ == "__main__":
    copiar()
    faltando = verificar()

    n = sum(len(a) for _, _, a in os.walk(DIST))
    print("dist/ gerada: %d arquivos, %.1f MB" % (n, tamanho(DIST) / 1e6))

    if faltando:
        print("\nERRO: assets citados no HTML que não existem em dist/:")
        for f in faltando:
            print("  " + f)
        sys.exit(1)

    print("Todos os assets referenciados estão presentes.")
    print("\nArraste a pasta dist/ em https://app.netlify.com/drop")
