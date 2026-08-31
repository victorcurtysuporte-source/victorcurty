# Dr. Victor Curty — site

Site estático (HTML, CSS e JS puros). Sem build, sem dependências de pacote.

## Fonte única

Você **edita a raiz**. A pasta `dist/` é **gerada** por `build.py` e é o que
vai para a Netlify. Como ela é apagada e refeita a cada build, não existe
mais o risco de uma cópia manual ficar desatualizada, que era o problema da
antiga pasta `deploy/`.

**Nunca edite nada dentro de `dist/`.** Toda alteração é na raiz.

```
├── index.html            Home                    ─┐
├── consultoria/          Consultoria online       │
├── mentoria/             Mentoria Método RACI®    │  fonte que
├── privacidade/ termos/  Páginas legais           │  você edita
├── 404.html                                       │
├── assets/                                        │
│   ├── css/ js/          Estilo e script          │
│   ├── img/              Favicon                  │
│   ├── opt/              WebP responsivos + OG    │
│   └── *.jpeg *.png      Masters das imagens     ─┘  (não vão ao ar)
├── _originais/           Fotos brutas, .docx      (não vai ao ar)
├── build.py build.cmd    Gera a dist/
├── netlify.toml robots.txt sitemap.xml
└── dist/                 GERADA — é isto que sobe
```

Os masters em `assets/*.jpeg|png` e a pasta `_originais/` ficam fora da
`dist/`: o site só serve os derivados de `assets/opt/`. Por isso a `dist/`
tem ~2,3 MB, contra os ~13 MB da antiga `deploy/`.

## Deploy

### Arrastar na Netlify (fluxo atual)

```bash
python build.py
```

No Windows dá para clicar duas vezes em `build.cmd`. Depois arraste a pasta
`dist/` em <https://app.netlify.com/drop>.

O build confere, antes de terminar, se todo asset citado nos HTML existe
dentro da `dist/` — se faltar algum, ele falha em vez de publicar um site
com imagem quebrada.

Os headers de segurança e de cache vêm do `netlify.toml` que o build escreve
**dentro** da `dist/`, porque é esse que a Netlify lê no deploy por arrastar.

### Git conectado (se um dia migrar)

O `netlify.toml` da raiz já traz `publish = "dist"` e
`command = "python build.py"`. Não precisa mudar nada.

## Formulários (Netlify Forms)

Os dois formulários (`consultoria` e `mentoria`) usam **Netlify Forms**.
Cada um declara `name`, `data-netlify="true"`, `netlify-honeypot="bot-field"`
e um campo oculto `form-name`. A Netlify detecta os formulários no HTML
estático no momento do deploy — nenhum backend é necessário.

O envio é feito por `fetch` em `assets/js/main.js`, com POST na própria
origem. O estado de sucesso **só aparece quando a Netlify responde 2xx**;
qualquer outra resposta mantém os dados preenchidos e mostra erro.

Dois pontos dependem do painel da Netlify, uma vez por site:

1. **Form detection** precisa estar ativo em
   *Site configuration → Forms*. Sem isso a Netlify responde 404 ao POST
   e o formulário mostra o estado de erro (que é o comportamento correto,
   mas nenhum lead é gravado).
2. **Notificações** em *Forms → Settings → Form notifications*: cadastre o
   e-mail que deve receber cada envio. Sem isso os envios ficam apenas
   registrados no painel.

Abrindo o site fora da Netlify (servidor local, `file://`), o POST falha e
o formulário mostra erro. Isso é intencional: nunca há sucesso simulado.

## Alterando CSS ou JS

Os assets são versionados por query string (`?v=8`). **Ao alterar
`assets/css/style.css` ou `assets/js/*.js`, incremente o número em todos os
HTML** (`index.html`, `consultoria/`, `mentoria/`, `privacidade/`, `termos/`,
`404.html`) e rode `build.py` de novo.

Os derivados em `assets/opt/` carregam a largura no nome
(`victor-mentor-720.webp`), então nome novo significa arquivo novo e o
cache pode ser imutável — não precisam de `?v=`.

## Imagens

`assets/opt/` guarda os derivados WebP responsivos e as imagens Open Graph
(1200×630). Foram gerados a partir dos originais em `assets/` com Pillow.
Para regerar depois de trocar uma foto, redimensione para as mesmas
larguras usadas no `srcset` do HTML correspondente.

## Terceiros

- **GSAP 3.12.5** (cdnjs) — polimento de scroll. Carregado com `defer` e
  `integrity` (SRI) fixado.
- **Three.js 0.160.0** (jsDelivr) — campo de partículas do hero. Resolvido
  por import map e carregado por import dinâmico apenas nas páginas que têm
  o canvas do hero e quando o visitante não pediu menos movimento.
  Não leva SRI: o atributo `integrity` em import maps ainda não tem suporte
  consistente nos navegadores alvo, e inventar um hash quebraria o
  carregamento. O site funciona sem ele — sem o Three, o gradiente do CSS
  permanece como fundo.
- **Google Analytics 4** — só é carregado após consentimento explícito no
  banner de cookies (`assets/js/tracking.js`).
