import { trackProjectClick } from '../../utils/analytics'

interface ProjectCardProps {
  title: string
  description: string
  image?: string
  technologies: string[]
  link?: string
  github?: string
}

const ProjectCard = ({
  title,
  description,
  image,
  technologies,
  link,
  github,
}: ProjectCardProps) => {
  const handleClick = () => {
    trackProjectClick(title)
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer')
    }
  }

  const handleGitHubClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    trackProjectClick(`${title} - GitHub`)
    if (github) {
      window.open(github, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="group relative bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-all duration-300 transform hover:scale-105">
      {/* Imagem do projeto ou placeholder */}
      <div className="aspect-video bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900 relative overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent">
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Imagem do projeto</p>
            </div>
          </div>
        )}
        {/* Overlay sutil para melhor contraste */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/20 pointer-events-none" />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-4">{description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {technologies.map((tech) => (
            <span
              key={tech}
              className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded"
            >
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4">
          {link && (
            <button
              onClick={handleClick}
              className="text-primary-400 hover:text-primary-300 font-medium text-sm"
            >
              Ver Projeto →
            </button>
          )}
          {github && (
            <a
              href={github}
              onClick={handleGitHubClick}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white font-medium text-sm cursor-pointer"
            >
              GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectCard
