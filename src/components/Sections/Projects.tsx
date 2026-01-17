import { useEffect, useRef } from 'react'
import ProjectCard from '../UI/ProjectCard'
import { useGSAP } from '../../hooks/useGSAP'
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver'
import { trackSectionView } from '../../utils/analytics'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Dados de exemplo - substituir com projetos reais
const projects = [
  {
    id: 1,
    title: 'EaDuck',
    description:
      'Plataforma educacional desenvolvida para modernizar a educação. Sistema completo de gestão de ensino a distância com funcionalidades de cadastro de usuários, salas de aula, tarefas, avaliações e notificações. Desenvolvido com foco em usabilidade, segurança e inovação.',
    technologies: ['Java', 'TypeScript', 'Spring', 'React', 'HTML', 'SCSS'],
    link: '#',
    github: 'https://github.com/Usales/EaDuck',
    image: '/images/pato-pixel.jpg',
  },
  {
    id: 2,
    title: 'API de Controle Financeiro',
    description:
      'API REST completa para gerenciamento financeiro pessoal e em grupos. Permite cadastro de pessoas, grupos, metas financeiras, lançamentos (entradas e saídas) e geração de relatórios detalhados. Desenvolvida com Spring Boot, inclui documentação Swagger e suporte para PostgreSQL em produção.',
    technologies: ['Java', 'Spring Boot', 'JPA/Hibernate', 'PostgreSQL', 'Swagger', 'Docker'],
    link: '#',
    github: 'https://github.com/PedroAugusto-sys/financas',
    image: '/images/dinheiro.jpg',
  },
  {
    id: 3,
    title: 'Crust-Delivery',
    description:
      'Sistema de delivery desenvolvido como projeto integrador do 6° período do SENAI. Plataforma completa para gestão de entregas com backend em Java, incluindo gerenciamento de pedidos, rotas e dados de entrega. Projeto acadêmico focado em aplicação prática de conceitos de desenvolvimento de software.',
    technologies: ['Java', 'Spring Boot', 'Backend', 'API REST'],
    link: '#',
    github: 'https://github.com/PedroAugusto-sys/Crust-Delivery',
    image: '/images/delivery.png',
  },
  {
    id: 4,
    title: 'Sistema de Análise Educacional',
    description:
      'Solução completa para monitoramento e análise de dados educacionais com backend em FastAPI e frontend em Streamlit. Sistema de Big Data que oferece visualização de desempenho acadêmico, controle de frequência, acompanhamento de tarefas e monitoramento de comunicações. Inclui pipeline ETL com Pandas para processamento e transformação de dados educacionais.',
    technologies: ['Python', 'FastAPI', 'Streamlit', 'MongoDB', 'Pandas', 'Big Data'],
    link: '#',
    github: 'https://github.com/PedroAugusto-sys/bigdata',
    image: '/images/educacional.png',
  },
  {
    id: 5,
    title: 'Automatização de Credenciais',
    description:
      'Extensão do Chrome desenvolvida para simplificar o processo de login no sistema EscolarManager. Permite que os usuários configurem suas credenciais uma vez e façam login automaticamente usando tokens, eliminando a necessidade de inserir manualmente usuário e senha a cada acesso. Inclui armazenamento seguro local, interface intuitiva e atalho de teclado para ativação rápida.',
    technologies: ['JavaScript', 'Chrome Extension', 'HTML', 'CSS', 'Chrome APIs'],
    link: '#',
    github: 'https://github.com/PedroAugusto-sys/Assistente-Escolar',
    image: '/images/qa.png',
  },
  {
    id: 6,
    title: 'Automação de QA',
    description:
      'Projeto de automação de testes de qualidade de software desenvolvido para otimizar processos de validação e garantir a qualidade dos produtos. Inclui frameworks de automação, scripts de teste e integração com pipelines de CI/CD para execução contínua de testes.',
    technologies: ['Selenium', 'Playwright', 'Python', 'Java', 'Test Automation', 'CI/CD'],
    link: '#',
    github: 'https://github.com/PedroAugusto-sys/qa_automacao',
    image: undefined, // Adicione a imagem aqui quando disponível
  },
  {
    id: 7,
    title: 'Gerador de Relatório Automático QA',
    description:
      'Userscript para Tampermonkey que automatiza a criação de chamados no Mantis a partir do Escolar Manager. Inclui botão flutuante arrastável, popup interativo com fluxo passo a passo, captura automática de dados da página, seleção múltipla de clientes com pesquisa e preenchimento automático de formulários no Mantis. Otimiza fluxos de trabalho de QA com interface intuitiva e tratamento de erros.',
    technologies: ['JavaScript', 'Tampermonkey', 'Userscript', 'Automação', 'QA'],
    link: '#',
    github: 'https://github.com/PedroAugusto-sys/geradorRelatorioAutomaticoQA',
    image: '/images/qa-livro.jpg',
  },
  {
    id: 8,
    title: 'Mantis Timeline Monitor',
    description:
      'Extensão para Chrome (Manifest V3) que monitora a "Linha do Tempo" do Mantis e notifica o usuário sobre novas atividades. Inclui monitoramento automático a cada minuto, notificações do sistema, filtro por usuário, histórico de notificações ilimitado, interface popup para controle e modal de configuração inicial. Desenvolvida para otimizar o acompanhamento de atividades no Mantis Bug Tracker.',
    technologies: ['JavaScript', 'Chrome Extension', 'Manifest V3', 'HTML', 'CSS', 'Chrome APIs'],
    link: '#',
    github: 'https://github.com/PedroAugusto-sys/mantis_notificator',
    image: '/images/timeline.png',
  },
  {
    id: 9,
    title: 'Sistema de Mensageria Local',
    description:
      'Sistema completo de mensageria para rede local com funcionalidades avançadas de chat em tempo real. Inclui autenticação JWT, chat em tempo real via Socket.IO, criação de grupos, upload de arquivos e imagens, fotos de perfil personalizáveis, edição e exclusão de mensagens, indicadores de leitura, busca de conversas e interface responsiva. Desenvolvido com TypeScript, Node.js e SQLite para comunicação interna em empresas.',
    technologies: ['TypeScript', 'JavaScript', 'Node.js', 'Socket.IO', 'JWT', 'SQLite', 'HTML', 'CSS'],
    link: '#',
    github: 'https://github.com/PedroAugusto-sys/sistema_mensageria_praempresa',
    image: '/images/bubble_speech.png',
  },
]

const Projects = () => {
  const { elementRef, hasIntersected } = useIntersectionObserver({ 
    threshold: 0.2,
    rootMargin: '200px', // Pré-carregar quando estiver a 200px da viewport
    persist: true // Manter estado após primeira interseção
  })
  const { animateIn } = useGSAP()
  const animationsCreatedRef = useRef(false)

  useEffect(() => {
    if (hasIntersected) {
      trackSectionView('projects')
    }
  }, [hasIntersected])

  useEffect(() => {
    // Garantir que animações sejam criadas apenas uma vez
    if (hasIntersected && elementRef.current && !animationsCreatedRef.current) {
      // Animar título da seção
      const titleSection = elementRef.current.querySelector('h2')?.parentElement
      if (titleSection) {
        gsap.set(titleSection, { opacity: 0, y: 30 })
        gsap.to(titleSection, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: titleSection,
            start: 'top 85%',
            toggleActions: 'play none none none',
            once: true,
          },
        })
      }

      // Animar cards de projeto
      const cards = elementRef.current.querySelectorAll('.project-card')
      cards.forEach((card, index) => {
        // Garantir que elementos tenham estado inicial correto
        gsap.set(card, { opacity: 0, y: 50, scale: 0.95 })
        gsap.to(card, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          delay: 0.3 + index * 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 80%',
            toggleActions: 'play none none none',
            once: true,
          },
        })
      })
      animationsCreatedRef.current = true
    }
  }, [hasIntersected, animateIn, elementRef])

  return (
    <section
      id="projects"
      ref={elementRef}
      className="relative min-h-screen py-20 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Título */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Meus <span className="text-primary-400">Projetos</span>
          </h2>
          <p className="text-gray-400 text-lg">
            Uma seleção dos meus trabalhos mais recentes
          </p>
        </div>

        {/* Grid de Projetos */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {projects.map((project, index) => (
            <div key={project.id} className="project-card">
              <ProjectCard
                title={project.title}
                description={project.description}
                technologies={project.technologies}
                link={project.link}
                github={project.github}
                image={project.image}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Projects
