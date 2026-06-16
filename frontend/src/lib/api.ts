import axios, { AxiosError } from 'axios'
import { clearAuth, getToken } from './auth'

/**
 * Cliente HTTP único da aplicação.
 *
 * Em desenvolvimento o Vite faz proxy de /api para o api-gateway
 * (ver vite.config.ts). Em produção a baseURL pode vir de
 * VITE_API_BASE_URL.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Anexa o JWT em toda requisição autenticada.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Em caso de 401, derruba a sessão e força novo login.
api.interceptors.response.use(
  (resp) => resp,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAuth()
      // Evita loops infinitos: só redireciona se já estivermos
      // fora da tela de login.
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export interface LoginRequest {
  matricula: string
  senha: string
}

export interface LoginResponse {
  token: string
  perfil: string
  nome?: string
  primeiroAcesso?: boolean
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  return data
}

export interface PrimeiroAcessoRequest {
  matricula: string
  senhaTemporaria: string
  novaSenha: string
}

export async function primeiroAcesso(
  payload: PrimeiroAcessoRequest,
): Promise<void> {
  await api.post('/auth/primeiro-acesso', payload)
}

/* ── Cursos (ms-cursos) ─────────────────────────────────── */

export interface Curso {
  id: string
  nome: string
  descricao: string
  ativo: boolean
  criadoEm: string
}

export async function listarCursos(): Promise<Curso[]> {
  const { data } = await api.get<Curso[]>('/cursos')
  return data
}

export interface Inscricao {
  id: string
  alunoId: string
  cursoId: string
  nomeCurso: string
  descricaoCurso: string
  dataInscricao: string
  concluido: boolean
}

export async function listarMinhasInscricoes(): Promise<Inscricao[]> {
  const { data } = await api.get<Inscricao[]>('/inscricoes/minhas')
  return data
}

export async function inscreverEmCurso(cursoId: string): Promise<Inscricao> {
  const { data } = await api.post<Inscricao>('/inscricoes', { cursoId })
  return data
}

export async function concluirInscricao(inscricaoId: string): Promise<Inscricao> {
  const { data } = await api.put<Inscricao>(`/inscricoes/${inscricaoId}/concluir`)
  return data
}

/* ── Stats (ms-cursos) ──────────────────────────────────── */

export interface StatsAluno {
  cursosAtivos: number
  cursosConcluidos: number
  certificados: number
  totalCursos: number
}

export interface StatsProfessor {
  totalCursos: number
  totalInscricoes: number
  totalConcluidos: number
  alunosAtivos: number
}

export interface StatsAdmin {
  totalCursos: number
  totalInscricoes: number
  totalConcluidos: number
  totalAlunos: number
}

export type Stats = StatsAluno | StatsProfessor | StatsAdmin

export async function getStats(): Promise<Stats> {
  const { data } = await api.get<Stats>('/stats')
  return data
}

/* ── Certificados (ms-certificados) ────────────────────── */

export interface Certificado {
  id: string
  alunoId: string
  cursoId: string
  qrCode: string
  emitidoEm: string
  valido: boolean
}

/**
 * Busca o certificado de um aluno em um curso específico.
 * Retorna null se não encontrado (404).
 */
/* ── Questões (ms-questoes) ─────────────────────────────────── */

export interface QuestaoStats {
  total: number
}

export async function getQuestaoStats(): Promise<QuestaoStats> {
  const { data } = await api.get<QuestaoStats>('/questoes/stats')
  return data
}

export async function triggerImportarEnem(): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>('/questoes/importar')
  return data
}

export async function buscarCertificado(
  alunoId: string,
  cursoId: string,
): Promise<Certificado | null> {
  try {
    const { data } = await api.get<Certificado>(
      `/certificados/${alunoId}/${cursoId}`,
    )
    return data
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 404
    ) {
      return null
    }
    throw err
  }
}

export async function listarCertificadosPorAluno(alunoId: string): Promise<Certificado[]> {
  const { data } = await api.get<Certificado[]>(`/certificados/${alunoId}`)
  return data
}

/* ── Simulados (ms-simulados) ────────────────────────────── */

export interface Simulado {
  id: string
  titulo: string
  turmaId?: string
  tempoMinutos: number
  pontuado: boolean
  dataInicio?: string
  dataFim?: string
  criadoEm: string
  questaoIds?: string[]
}

export interface TentativaSimulado {
  id: string
  simuladoId: string
  alunoId: string
  nota: number
  iniciadoEm: string
  finalizadoEm: string
  tempoGastoSegundos: number
}

export interface ResultadoSimulado {
  tentativaId: string
  simuladoId: string
  alunoId: string
  nota: number
  acertos: number
  total: number
  iniciadoEm: string
  finalizadoEm: string
  tempoGastoSegundos: number
}

export async function listarSimulados(turmaId?: string): Promise<Simulado[]> {
  const params = turmaId ? { turmaId } : {}
  const { data } = await api.get<Simulado[]>('/simulados', { params })
  return data
}

export async function buscarSimulado(id: string): Promise<Simulado> {
  const { data } = await api.get<Simulado>(`/simulados/${id}`)
  return data
}

export async function listarMeusSimulados(): Promise<Simulado[]> {
  const { data } = await api.get<Simulado[]>('/simulados/professor/meus')
  return data
}

export async function criarSimulado(payload: {
  titulo: string
  turmaId?: string
  tempoMinutos: number
  pontuado: boolean
  dataInicio?: string
  dataFim?: string
}): Promise<Simulado> {
  const { data } = await api.post<Simulado>('/simulados', payload)
  return data
}

export async function listarMinhasTentativas(): Promise<TentativaSimulado[]> {
  const { data } = await api.get<TentativaSimulado[]>('/simulados/minhas-tentativas')
  return data
}

export async function resultadoSimulado(simuladoId: string): Promise<ResultadoSimulado> {
  const { data } = await api.get<ResultadoSimulado>(`/simulados/${simuladoId}/resultado`)
  return data
}

/* ── Turmas (ms-autenticacao) ────────────────────────────── */

export interface Turma {
  id: string
  nome: string
  ano: number
  modalidade: string
  instituicaoId: string
  nomeInstituicao: string
  professorId?: string
  ativo: boolean
  criadoEm: string
}

export interface AlunoTurma {
  alunoId: string
  nome: string
  matricula: string
  perfil: string
}

export async function listarTurmas(instituicaoId?: string): Promise<Turma[]> {
  const params = instituicaoId ? { instituicaoId } : {}
  const { data } = await api.get<Turma[]>('/turmas', { params })
  return data
}

export async function listarMinhasTurmas(): Promise<Turma[]> {
  const { data } = await api.get<Turma[]>('/turmas/minhas')
  return data
}

export async function listarAlunosDaTurma(turmaId: string): Promise<AlunoTurma[]> {
  const { data } = await api.get<AlunoTurma[]>(`/turmas/${turmaId}/alunos`)
  return data
}

export async function criarTurma(payload: {
  nome: string
  ano: number
  modalidade: string
  instituicaoId: string
}): Promise<Turma> {
  const { data } = await api.post<Turma>('/turmas', payload)
  return data
}

export async function adicionarAlunoTurma(turmaId: string, alunoId: string): Promise<void> {
  await api.post(`/turmas/${turmaId}/alunos`, { alunoId })
}

  /* ── Instituições (ms-autenticacao) ──────────────────────── */

  export interface Instituicao {
    id: string
    nome: string
    municipio: string
    codigoInep: string
    ativo: boolean
    criadoEm: string
  }

  export async function listarInstituicoes(): Promise<Instituicao[]> {
    const { data } = await api.get<Instituicao[]>('/instituicoes')
    return data
  }

  export async function criarInstituicao(payload: {
    nome: string
    municipio: string
    codigoInep: string
  }): Promise<Instituicao> {
    const { data } = await api.post<Instituicao>('/instituicoes', payload)
    return data
  }

  /* ── Agendamento de prova prática (ms-autenticacao) ──────── */

  export interface SlotProva {
    id: string
    moduloId: string
    data: string
    local: string
    vagasTotais: number
    vagasOcupadas: number
    vagasDisponiveis: number
  }

  export interface AgendamentoProva {
    id: string
    alunoId: string
    slotId: string
    dataProva: string | null
    local: string | null
  }

  export async function listarSlotsDisponiveis(): Promise<SlotProva[]> {
    const { data } = await api.get<SlotProva[]>('/agendamentos/slots')
    return data
  }

  export async function listarMeusAgendamentos(): Promise<AgendamentoProva[]> {
    const { data } = await api.get<AgendamentoProva[]>('/agendamentos/meus')
    return data
  }

  export async function agendarProva(slotId: string): Promise<AgendamentoProva> {
    const { data } = await api.post<AgendamentoProva>('/agendamentos', { slotId })
    return data
  }

  export async function reagendarProva(
    agendamentoId: string,
    novoSlotId: string,
  ): Promise<AgendamentoProva> {
    const { data } = await api.put<AgendamentoProva>(/agendamentos/${agendamentoId}, {
      novoSlotId,
    })
    return data
  }

  export async function cancelarAgendamento(agendamentoId: string): Promise<void> {
    await api.delete(/agendamentos/${agendamentoId})
  }

/* ── Usuários Admin (ms-autenticacao) ────────────────────── */

export interface Usuario {
  id: string
  nome: string
  matricula: string
  cpf?: string
  email?: string
  perfil: string
  ativo: boolean
  primeiroAcesso: boolean
  instituicaoId?: string
  nomeInstituicao?: string
  criadoEm: string
}

export async function listarUsuarios(instituicaoId?: string): Promise<Usuario[]> {
  const params = instituicaoId ? { instituicaoId } : {}
  const { data } = await api.get<Usuario[]>('/admin/usuarios', { params })
  return data
}

export async function criarUsuario(payload: {
  nome: string
  matricula: string
  cpf?: string
  email?: string
  senhaTemporaria: string
  perfil: string
  instituicaoId?: string
}): Promise<Usuario> {
  const { data } = await api.post<Usuario>('/admin/usuarios', payload)
  return data
}

export async function desativarUsuario(id: string): Promise<Usuario> {
  const { data } = await api.put<Usuario>(`/admin/usuarios/${id}/desativar`)
  return data
}

export async function reativarUsuario(id: string): Promise<Usuario> {
  const { data } = await api.put<Usuario>(`/admin/usuarios/${id}/reativar`)
  return data
}

/* ── Relatórios (ms-relatorios) ──────────────────────────── */

export interface ResumoRede {
  total_instituicoes: number
  total_turmas: number
  total_alunos: number
  total_professores: number
  media_geral_nota: number
  gerado_em: string
}

export interface TaxaConclusaoCurso {
  curso_id: string
  total_inscritos: number
  total_concluidos: number
  taxa_conclusao: number
}

export interface AlunosPrimeiroAcesso {
  total: number
  alunos: Array<{
    id: string
    nome: string
    matricula: string
    perfil: string
    criado_em: string
  }>
}

export async function getResumoRede(): Promise<ResumoRede> {
  const { data } = await api.get<ResumoRede>('/relatorios/rede/resumo')
  return data
}

export async function getTaxaConclusao(): Promise<TaxaConclusaoCurso[]> {
  const { data } = await api.get<TaxaConclusaoCurso[]>('/relatorios/cursos/taxa-conclusao')
  return data
}

export async function getAlunosPrimeiroAcesso(): Promise<AlunosPrimeiroAcesso> {
  const { data } = await api.get<AlunosPrimeiroAcesso>('/relatorios/alunos/primeiro-acesso')
  return data
}

export interface PainelMunicipioItem {
  municipio: string
  total_instituicoes: number
  total_alunos: number
  total_professores: number
  media_notas: number
}

export interface PainelMacro {
  total_municipios: number
  municipios: PainelMunicipioItem[]
  gerado_em: string
}

export async function getPainelMacro(): Promise<PainelMacro> {
  const { data } = await api.get<PainelMacro>('/relatorios/seed/painel-macro')
  return data
}

/* ── Auth — redefinição de senha ────────────────────────── */

export interface RedefinicaoResponse {
  token: string
  expiraEm: string
  mensagem: string
}

export async function solicitarRedefinicao(matricula: string): Promise<RedefinicaoResponse> {
  const { data } = await api.post<RedefinicaoResponse>('/auth/solicitar-redefinicao', { matricula })
  return data
}

export async function redefinirSenha(token: string, novaSenha: string): Promise<void> {
  await api.post('/auth/redefinir-senha', { token, novaSenha })
}

/* ── Importação CSV ─────────────────────────────────────── */

export interface ImportacaoItem {
  linha: number
  matricula: string
  status: 'ok' | 'erro'
  mensagem: string
}

export interface ImportacaoResult {
  total: number
  importados: number
  erros: number
  detalhes: ImportacaoItem[]
}

export async function importarAlunos(arquivo: File): Promise<ImportacaoResult> {
  const formData = new FormData()
  formData.append('arquivo', arquivo)
  const { data } = await api.post<ImportacaoResult>('/admin/usuarios/importar-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/* ── Questões (detalhe + favoritas) ─────────────────────── */

export interface AlternativaQuestao {
  id: string
  texto: string
  correta: boolean | null
  ordem: number
}

export interface Questao {
  id: string
  enunciado: string
  tipo: string
  dificuldade: string
  tipoUso: string
  nivelEnsino?: string
  disciplina: string
  explicacao?: string | null
  alternativas: AlternativaQuestao[]
}

export async function getQuestao(id: string): Promise<Questao> {
  const { data } = await api.get<Questao>(`/questoes/${id}`)
  return data
}

export interface Gabarito {
  questaoId: string
  alternativaCorretaId: string | null
  explicacao: string | null
}

export async function getGabaritoQuestao(id: string): Promise<Gabarito> {
  const { data } = await api.get<Gabarito>(`/questoes/${id}/gabarito`)
  return data
}

export async function listarQuestoesFavoritas(): Promise<Questao[]> {
  const { data } = await api.get<Questao[]>('/questoes/favoritas')
  return data
}

export async function favoritarQuestao(id: string): Promise<void> {
  await api.post(`/questoes/${id}/favoritar`)
}

export async function desfavoritarQuestao(id: string): Promise<void> {
  await api.delete(`/questoes/${id}/favoritar`)
}

/* ── Sessão de simulado (execução) ──────────────────────── */

export interface SessaoSimulado {
  simuladoId: string
  alunoId: string
  iniciadoEm: string
  questaoAtual: number
  respostas: Record<number, string>
}

export async function iniciarSimulado(id: string): Promise<SessaoSimulado> {
  const { data } = await api.post<SessaoSimulado>(`/simulados/${id}/iniciar`)
  return data
}

export async function getSessaoSimulado(id: string): Promise<SessaoSimulado | null> {
  try {
    const { data } = await api.get<SessaoSimulado>(`/simulados/${id}/sessao`)
    return data
  } catch {
    return null
  }
}

export async function responderSimulado(
  id: string,
  questaoIndex: number,
  alternativaId: string,
): Promise<void> {
  await api.put(`/simulados/${id}/responder`, {
    questaoIndex: String(questaoIndex),
    alternativaId,
  })
}

export async function finalizarSimulado(id: string): Promise<ResultadoSimulado> {
  const { data } = await api.post<ResultadoSimulado>(`/simulados/${id}/finalizar`)
  return data
}

/* ── Revisão comentada (gabarito pós-simulado) ──────────── */

export interface RevisaoAlternativa {
  id: string
  texto: string
  correta: boolean
  ordem: number
}

export interface RevisaoQuestao {
  ordem: number
  questaoId: string
  enunciado: string
  explicacao: string | null
  alternativas: RevisaoAlternativa[]
}

export async function revisaoSimulado(id: string): Promise<RevisaoQuestao[]> {
  const { data } = await api.get<RevisaoQuestao[]>(`/simulados/${id}/revisao`)
  return data
}

/* ── Exportação de relatórios (CSV) ─────────────────────── */

async function baixarCsv(url: string, nomeArquivo: string): Promise<void> {
  const resp = await api.get(url, { responseType: 'blob' })
  const blobUrl = window.URL.createObjectURL(resp.data as Blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

export function exportarPainelMacroCsv(): Promise<void> {
  return baixarCsv('/relatorios/seed/painel-macro/export', 'painel-macro.csv')
}

export function exportarTaxaConclusaoCsv(): Promise<void> {
  return baixarCsv('/relatorios/cursos/taxa-conclusao/export', 'taxa-conclusao.csv')
}
