import { Hono } from 'hono';
import { questionBanks } from '../state';

const questionBankRoutes = new Hono();

// List all available question banks
questionBankRoutes.get('/', (c) => {
  const banks = Array.from(questionBanks.values()).map((bank) => ({
    id: bank.id,
    name: bank.metadata.name,
    description: bank.metadata.description,
    topics: bank.metadata.topics,
    questionCount: bank.questions.length,
  }));

  return c.json({ questionBanks: banks });
});

// Get a specific question bank with questions
questionBankRoutes.get('/:id', (c) => {
  const bankId = c.req.param('id');
  const bank = questionBanks.get(bankId);

  if (!bank) {
    return c.json({ error: 'Question bank not found' }, 404);
  }

  return c.json(bank);
});

export default questionBankRoutes;
