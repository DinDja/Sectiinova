import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ProjectCard from '../ProjectCard';
import DiaryBoard from '../DiaryBoard';
import ClubBoard from '../ClubBoard';

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
});

describe('DiaryBoard', () => {
  it('renders empty state when no project is selected', () => {
    render(<DiaryBoard selectedProject={null} />);
    expect(screen.getByText('Nenhum projeto selecionado')).toBeInTheDocument();
  });
});

describe('ClubBoard', () => {
  it('renders empty state when no club is selected', () => {
    render(<ClubBoard viewingClub={null} />);
    expect(screen.getByText('Nenhum clube selecionado')).toBeInTheDocument();
  });
});
