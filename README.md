# Portfolio Pedro

Portfolio profissional moderno construído com React, Three.js, GSAP e tecnologias de ponta.

## 🚀 Tecnologias

- **React 18** com **Vite** - Framework e build tool
- **Three.js r160** - Renderização 3D otimizada
- **GSAP 3.5.1** - Animações avançadas e scroll suave
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilização moderna
- **PWA** - Progressive Web App
- **Google Analytics 4** - Analytics
- **Google Tag Manager** - Gestão de tags
- **Netlify** - CDN e PaaS

## 📦 Instalação

```bash
npm install
npm run dev
npm run build
npm run preview
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_GA4_ID=G-XXXXXXXXXX
VITE_GTM_ID=GTM-XXXXXXX
VITE_SITE_URL=https://seudominio.com
```

### Google Analytics e Tag Manager

1. Obtenha seu ID do Google Analytics 4
2. Obtenha seu ID do Google Tag Manager
3. Adicione as variáveis de ambiente acima

## 📁 Estrutura do Projeto

```
portfolio_pedro/
├── public/
│   ├── manifest.json
│   ├── robots.txt
│   ├── sitemap.xml
│   └── models/          # Modelos 3D
├── src/
│   ├── components/
│   │   ├── ThreeJS/     # Componentes 3D
│   │   ├── Sections/    # Seções do portfólio
│   │   ├── UI/          # Componentes de UI
│   │   └── Analytics/   # Analytics
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utilitários
│   └── App.tsx
├── netlify.toml
└── vite.config.ts
```

## 🎨 Personalização

### Adicionar Conteúdo

1. **Sobre Mim**: Edite `src/components/Sections/About.tsx`
2. **Projetos**: Edite o array `projects` em `src/components/Sections/Projects.tsx`
3. **Conquistas**: Edite o array `achievements` em `src/components/Sections/Achievements.tsx`
4. **Foto de Perfil**: Substitua `public/images/face.png`

### Objetos 3D

- **Hero**: `src/components/ThreeJS/Character3D.tsx`
- **About**: `src/components/ThreeJS/About3D.tsx`
- **Projects**: `src/components/ThreeJS/Projects3D.tsx`
- **Achievements**: `src/components/ThreeJS/Achievements3D.tsx`

Modelos 3D devem estar em formato GLB na pasta `public/models/`. Veja `public/models/README.md` para mais detalhes.

## 🚀 Deploy no Netlify

### Configuração Inicial

1. Conecte seu repositório ao Netlify
2. Configure as variáveis de ambiente no dashboard
3. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18` ou superior

### Variáveis de Ambiente no Netlify

```
VITE_GA4_ID=G-XXXXXXXXXX
VITE_GTM_ID=GTM-XXXXXXX
VITE_SITE_URL=https://seudominio.com
NODE_ENV=production
```

### Domínio Customizado

1. No Netlify Dashboard, vá em "Domain settings"
2. Clique em "Add custom domain"
3. Siga as instruções para configurar DNS
4. SSL será configurado automaticamente

### Atualizar Sitemap e Robots.txt

Edite `public/sitemap.xml` e `public/robots.txt` com sua URL real antes do deploy.

## 📱 PWA

O projeto está configurado como PWA. Para instalar:

1. Acesse o site no navegador
2. Clique no ícone de instalação na barra de endereços

**Ícones PWA necessários:**
- `public/pwa-192x192.png`
- `public/pwa-512x512.png`

Use ferramentas como [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) para gerar os ícones.

## 🎯 Otimizações de Performance

### Canvas 3D

- DPR reduzido para melhor performance
- Frameloop "demand" (renderiza apenas quando necessário)
- Luzes otimizadas
- Throttling adaptativo

### Scroll

- Scroll suave customizado com GSAP
- Throttle em event listeners
- ScrollTrigger otimizado
- CSS otimizado para scroll

### Modelos 3D

- Recomendado: < 2MB por modelo
- Polígonos: < 10k triângulos
- Texturas: 512x512 ou 1024x1024 (máximo)
- Use compressão Draco quando possível

Para otimizar modelos, use [gltf.report](https://gltf.report) com compressão Draco.

## 🔒 Segurança

Headers de segurança configurados no `netlify.toml`:
- HSTS
- Content Security Policy
- XSS Protection
- Frame Options

## 📊 Performance

- Code splitting automático
- Lazy loading de componentes 3D
- Otimização de assets
- Cache strategy para PWA
- Throttling em event listeners
- Memoização de componentes

## 📝 Licença

Este projeto é privado e pessoal.

## 👤 Autor

Pedro - Desenvolvedor Full Stack

---

Desenvolvido com ❤️ usando React, Three.js e GSAP
