import { useState } from 'react'
  import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
  import { criarInstituicao, listarInstituicoes, type Instituicao } from '../lib/api'

  /* ── Modal de nova escola ──────────────────────────────────── */

  function NovaEscolaModal({ onClose }: { onClose: () => void }) {
    const qc = useQueryClient()
    const [form, setForm] = useState({ nome: '', municipio: '', codigoInep: '' })
    const [erro, setErro] = useState('')

    const mutation = useMutation({
      mutationFn: criarInstituicao,
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['instituicoes'] })
        onClose()
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { mensagem?: string } } })?.response?.data?.mensagem
        setErro(msg ?? 'Erro ao cadastrar escola.')
      },
    })

    const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

    const handleSubmit = (ev: React.FormEvent) => {
      ev.preventDefault()
      if (!form.nome.trim() || !form.municipio.trim() || !form.codigoInep.trim()) {
        return setErro('Nome, município e código INEP são obrigatórios.')
      }
      setErro('')
      mutation.mutate({
        nome: form.nome.trim(),
        municipio: form.municipio.trim(),
        codigoInep: form.codigoInep.trim(),
      })
    }

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" 
  aria-modal="true" aria-labelledby="nova-escola-titulo">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
            <h2 id="nova-escola-titulo" className="font-bold text-gray-800">Nova escola</h2>
            <button onClick={onClose} aria-label="Fechar" className="text-gray-400 hover:text-gray-600 
  text-xl">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {erro && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da escola *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none 
  focus:ring-2 focus:ring-blue-500"
                value={form.nome} onChange={set('nome')} placeholder="Escola Estadual..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Município *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none 
  focus:ring-2 focus:ring-blue-500"
                  value={form.municipio} onChange={set('municipio')} placeholder="Aracaju" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código INEP *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none 
  focus:ring-2 focus:ring-blue-500"
                  value={form.codigoInep} onChange={set('codigoInep')} placeholder="28000000" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 
  text-sm hover:bg-gray-200">Cancelar</button>
              <button type="submit" disabled={mutation.isPending}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 
  disabled:opacity-50">
                {mutation.isPending ? 'Cadastrando...' : 'Cadastrar escola'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  /* ── Página principal ──────────────────────────────────────── */

  export default function EscolasPage() {
    const [busca, setBusca] = useState('')
    const [novaEscola, setNovaEscola] = useState(false)

    const { data: instituicoes = [], isLoading } = useQuery({
      queryKey: ['instituicoes'],
      queryFn: listarInstituicoes,
    })

    const filtradas = instituicoes.filter((i: Instituicao) =>
      busca === '' ||
      i.nome.toLowerCase().includes(busca.toLowerCase()) ||
      i.municipio.toLowerCase().includes(busca.toLowerCase()) ||
      i.codigoInep.toLowerCase().includes(busca.toLowerCase())
    )

    return (
      <div className="space-y-6">
        {novaEscola && <NovaEscolaModal onClose={() => setNovaEscola(false)} />}

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between gap-4
  flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Escolas da rede</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {instituicoes.length} {instituicoes.length === 1 ? 'instituição cadastrada' : 'instituições cadastradas'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              aria-label="Buscar escolas por nome ou município"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2
  focus:ring-blue-500 w-56"
              placeholder="Buscar por nome ou município..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <button
              onClick={() => setNovaEscola(true)}
              aria-label="Cadastrar nova escola"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition
  whitespace-nowrap"
            >
              + Nova escola
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-white rounded-xl border animate-pulse" />)}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-gray-100">
            <p className="text-gray-400 text-sm">
              {busca ? 'Nenhuma escola encontrada para a busca.' : 'Nenhuma escola cadastrada ainda.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm" aria-label="Lista de escolas">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Escola</th>
                  <th scope="col" className="px-5 py-3 font-medium">Município</th>
                  <th scope="col" className="px-5 py-3 font-medium">Código INEP</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Cadastrada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map((i: Instituicao) => (
                  <tr key={i.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">{i.nome}</td>
                    <td className="px-5 py-3 text-gray-500">{i.municipio}</td>
                    <td className="px-5 py-3 font-mono text-gray-500">{i.codigoInep}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        i.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`} aria-label={i.ativo ? 'Escola ativa' : 'Escola inativa'}>
                        {i.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(i.criadoEm).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }
