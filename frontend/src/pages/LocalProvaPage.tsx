
  import { useState } from 'react'
  import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
  import {
    agendarProva,
    cancelarAgendamento,
    listarMeusAgendamentos,
    listarSlotsDisponiveis,
    reagendarProva,
    type AgendamentoProva,
    type SlotProva,
  } from '../lib/api'
  import { EmptyState } from '../components/EmptyState'
  import { StatusBanner } from '../components/StatusBanner'

  /* ── Helpers de formatação ─────────────────────────────────── */

  function formatarDataHora(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /* ── Página principal ──────────────────────────────────────── */

  export default function LocalProvaPage() {
    const qc = useQueryClient()
    const [reagendandoId, setReagendandoId] = useState<string | null>(null)

    const { data: agendamentos = [], isLoading: loadingAgend } = useQuery({
      queryKey: ['meus-agendamentos'],
      queryFn: listarMeusAgendamentos,
    })

    const { data: slots = [], isLoading: loadingSlots } = useQuery({
      queryKey: ['slots-prova'],
      queryFn: listarSlotsDisponiveis,
    })

    const invalidar = () => {
      qc.invalidateQueries({ queryKey: ['meus-agendamentos'] })
      qc.invalidateQueries({ queryKey: ['slots-prova'] })
    }

    const agendar = useMutation({
      mutationFn: agendarProva,
      onSuccess: invalidar,
      onError: () => alert('Não foi possível agendar. O horário pode estar lotado.'),
    })

    const reagendar = useMutation({
      mutationFn: ({ id, slotId }: { id: string; slotId: string }) => reagendarProva(id, slotId),
      onSuccess: () => {
        setReagendandoId(null)
        invalidar()
      },
      onError: () => alert('Não foi possível reagendar para este horário.'),
    })

    const cancelar = useMutation({
      mutationFn: cancelarAgendamento,
      onSuccess: invalidar,
      onError: () => alert('Não foi possível cancelar o agendamento.'),
    })

    const handleSlot = (slot: SlotProva) => {
      if (reagendandoId) {
        reagendar.mutate({ id: reagendandoId, slotId: slot.id })
      } else {
        agendar.mutate(slot.id)
      }
    }

    const isLoading = loadingAgend || loadingSlots
    const ocupando = agendar.isPending || reagendar.isPending

    return (
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">Local de prova</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Agende sua prova prática em um dos horários disponíveis.
          </p>
        </div>

        {reagendandoId && (
          <StatusBanner variant="info">
            Selecione abaixo o novo horário para reagendar sua prova.{' '}
            <button onClick={() => setReagendandoId(null)} className="underline font-medium">
              Cancelar reagendamento
            </button>
          </StatusBanner>
        )}

        {/* Meus agendamentos */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Meus agendamentos</h2>

          {loadingAgend ? (
            <div className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ) : agendamentos.length === 0 ? (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <EmptyState
                title="Nenhuma prova agendada"
                description="Escolha um horário disponível abaixo para agendar sua prova prática."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agendamentos.map((a: AgendamentoProva) => (
                <div key={a.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col
  gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{a.local ?? 'Local a definir'}</p>
                      <p className="text-sm text-gray-500">{formatarDataHora(a.dataProva)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Confirmado
                    </span>
                  </div>
                  <div className="flex gap-2 mt-auto pt-1">
                    <button
                      onClick={() => setReagendandoId(reagendandoId === a.id ? null : a.id)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                        reagendandoId === a.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {reagendandoId === a.id ? 'Selecionando...' : 'Reagendar'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Deseja realmente cancelar este agendamento?')) cancelar.mutate(a.id)
                      }}
                      disabled={cancelar.isPending}
                      className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100
  disabled:opacity-50 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Horários disponíveis */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Horários disponíveis</h2>
            {!isLoading && (
              <span className="text-sm text-gray-400">
                {slots.length} {slots.length === 1 ? 'horário' : 'horários'}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 bg-white rounded-xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <EmptyState
                title="Nenhum horário disponível"
                description="Novos horários de prova serão liberados em breve."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {slots.map((slot: SlotProva) => {
                const lotado = slot.vagasDisponiveis <= 0
                return (
                  <div key={slot.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col 
  gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">{slot.local}</p>
                      <p className="text-sm text-gray-500">{formatarDataHora(slot.data)}</p>
                    </div>
                    <p className={text-xs font-medium ${lotado ? 'text-red-500' : 'text-gray-400'}}>
                      {lotado
                        ? 'Sem vagas'
                        : ${slot.vagasDisponiveis} de ${slot.vagasTotais} vagas disponíveis}
                    </p>
                    <button
                      onClick={() => handleSlot(slot)}
                      disabled={lotado || ocupando}
                      className="mt-auto w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium
  hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ocupando ? 'Processando...' : reagendandoId ? 'Mover para cá' : 'Agendar'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    )
  }
