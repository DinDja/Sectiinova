import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { getLattesAreas, getLattesLink, getLattesSummary } from '../../utils/helpers';
import ProjectCard from '../projects/ProjectCard';
import DiaryBoard from '../diary/DiaryBoard';
import ClubBoard from '../club/ClubBoard';

describe('ProjectCard', () => {
  it('renders project data and actions', () => {
    const project = { id: 'p1', titulo: 'Teste', descricao: 'Desc', status: 'Em andamento', area_tematica: 'Robótica', clube_id: 'c1' };
    const club = { id: 'c1', nome: 'Clube A' };
    const school = { id: 's1', nome: 'Escola X' };
    const team = { orientadores: [{nome: 'Prof A'}], coorientadores: [], investigadores: [] };

    render(
      <ProjectCard
        project={project}
        club={club}
        school={school}
        isCompleted={false}
        team={team}
        investigatorNames={[ 'Aluno 1' ]}
        onClubClick={vi.fn()}
        onDiaryClick={vi.fn()}
      />
    );

    expect(screen.getByText('Teste')).toBeInTheDocument();
    expect(screen.getByText('Clube A')).toBeInTheDocument();
    expect(screen.getByText('Escola X')).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.getByText('Robótica')).toBeInTheDocument();
  });

  it('does not duplicate the same user when they are in multiple roles', () => {
    const project = { id: 'p2', titulo: 'Teste 2', descricao: 'Desc 2', status: 'Pendente', area_tematica: 'STEAM', clube_id: 'c2' };
    const club = { id: 'c2', nome: 'Clube B' };
    const school = { id: 's2', nome: 'Escola Y' };
    const duplicateUser = { id: 'u1', nome: 'Prof B', avatar: 'https://example.com/avatar.png' };
    const team = {
      orientadores: [duplicateUser],
      coorientadores: [duplicateUser],
      investigadores: [duplicateUser],
      membros: [duplicateUser]
    };

    render(
      <ProjectCard
        project={project}
        club={club}
        school={school}
        isCompleted={false}
        team={team}
        investigatorNames={[ 'Aluno 2' ]}
        onClubClick={vi.fn()}
        onDiaryClick={vi.fn()}
      />
    );

    const teamAvatars = screen.getAllByTitle(/Prof B -/);
    expect(teamAvatars).toHaveLength(1);
  });
});

describe('DiaryBoard', () => {
  it('renders empty state when no project is selected', () => {
    render(<DiaryBoard selectedProject={null} />);
    expect(screen.getByText('Nenhum projeto selecionado')).toBeInTheDocument();
  });

  it('renders mentor lattes summary when lattes_data exists', () => {
    render(
      <DiaryBoard
        selectedProject={{ id: 'p1', titulo: 'Projeto Teste', status: 'Em andamento' }}
        selectedClub={{ nome: 'Clube A' }}
        selectedSchool={{ nome: 'Escola X' }}
        selectedTeam={{
          orientadores: [{
            id: 'o1',
            nome: 'Prof A',
            perfil: 'orientador',
            lattes: 'https://lattes.cnpq.br/1234567890123456',
            lattes_data: {
              resumo: 'Pesquisadora em robótica educacional.',
              areas_atuacao: ['Robótica / Educação'],
              formacao_academica: [{ tipo: 'Doutorado', nome_instituicao: 'UFBA', ano_conclusao: '2020' }],
              ultima_atualizacao: '01/01/2026'
            }
          }],
          coorientadores: [],
          investigadores: []
        }}
        derivedDiaryEntries={[]}
        canEditDiary={false}
        setIsModalOpen={vi.fn()}
        getInvestigatorDisplayNames={() => []}
        getLattesLink={getLattesLink}
      />
    );

    expect(screen.getByText('Pesquisadora em robótica educacional.')).toBeInTheDocument();
    expect(screen.getByText('Robótica / Educação')).toBeInTheDocument();
    expect(screen.getByText(/Última atualização no Lattes:/)).toBeInTheDocument();
  });
});

describe('helpers', () => {
  it('returns lattesLink from camelCase field', () => {
    const person = { lattesLink: 'http://lattes.cnpq.br/2323948141970443' };
    expect(getLattesLink(person)).toBe('http://lattes.cnpq.br/2323948141970443');
  });

  it('returns empty for missing link and prevents Lattes não informado fallback', () => {
    const person = { nome: 'Viviane' };
    expect(getLattesLink(person)).toBe('');
  });

  it('extracts summary and normalized areas from lattes_data', () => {
    const person = {
      lattes_data: {
        resumo: 'Resumo profissional.',
        areas_atuacao: [
          { grande_area: 'Ciências Exatas', area: 'Ciência da Computação', especialidade: 'IA' }
        ]
      }
    };

    expect(getLattesSummary(person)).toBe('Resumo profissional.');
    expect(getLattesAreas(person)).toEqual(['Ciências Exatas / Ciência da Computação / IA']);
  });
});

describe('ClubBoard', () => {
  it('renders empty state when no club is selected', () => {
    render(<ClubBoard viewingClub={null} />);
    expect(screen.getByText('Selecione um Ecossistema')).toBeInTheDocument();
  });

  it('renders mentor extra lattes data in club board', () => {
    render(
      <ClubBoard
        viewingClub={{ id: 'c1', nome: 'Clube A' }}
        viewingClubSchool={{ nome: 'Escola X' }}
        viewingClubProjects={[]}
        viewingClubUsers={[]}
        viewingClubOrientadores={[{
          id: 'o1',
          nome: 'Prof A',
          email: 'prof@example.com',
          lattes: 'https://lattes.cnpq.br/1234567890123456',
          lattes_data: {
            resumo: 'Atua com divulgação científica.',
            areas_atuacao: ['Educação Científica']
          }
        }]}
        viewingClubCoorientadores={[]}
        viewingClubInvestigadores={[]}
        viewingClubDiaryCount={0}
        setSelectedClubId={vi.fn()}
        setSelectedProjectId={vi.fn()}
        setCurrentView={vi.fn()}
      />
    );

    expect(screen.getByText('Atua com divulgação científica.')).toBeInTheDocument();
    expect(screen.getByText('Educação Científica')).toBeInTheDocument();
  });

  it('exibe a força investigadora no cabeçalho do clube', () => {
    render(
      <ClubBoard
        viewingClub={{ id: 'c1', nome: 'Clube A' }}
        viewingClubSchool={{ nome: 'Escola X' }}
        viewingClubProjects={[]}
        viewingClubUsers={[{ id: 'i1', nome: 'Aluno 1', perfil: 'investigador' }]}
        viewingClubOrientadores={[]}
        viewingClubCoorientadores={[]}
        viewingClubInvestigadores={[{ id: 'i1', nome: 'Aluno 1', perfil: 'investigador' }]}
        viewingClubDiaryCount={0}
        setSelectedClubId={vi.fn()}
        setSelectedProjectId={vi.fn()}
        setCurrentView={vi.fn()}
      />
    );

    expect(screen.getByText(/Força Investigadora:/)).toBeInTheDocument();
    expect(screen.getByText('1 pesquisador')).toBeInTheDocument();
    expect(screen.getByText(/100% da equipe/)).toBeInTheDocument();
  });
});
