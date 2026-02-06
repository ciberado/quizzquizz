#!/usr/bin/env node
import { loadQuestionBank } from '@quizzquizz/question-bank';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the sample question bank
const bankPath = join(__dirname, '../../../question-banks/sample-general-knowledge.md');

try {
  console.log('Loading question bank from:', bankPath);
  console.log('='.repeat(60));
  
  const bank = loadQuestionBank(bankPath);
  
  console.log(`\n📚 Question Bank: ${bank.metadata.name}`);
  if (bank.metadata.description) {
    console.log(`   ${bank.metadata.description}`);
  }
  console.log(`   Topics: ${bank.metadata.topics.join(', ')}`);
  console.log(`   Default Time Limit: ${bank.metadata.defaultTimeLimit}s`);
  console.log(`   Total Questions: ${bank.questions.length}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('Sample Questions:');
  console.log('='.repeat(60));
  
  bank.questions.slice(0, 3).forEach((q, idx) => {
    console.log(`\n${idx + 1}. [${q.difficulty.toUpperCase()}] ${q.text}`);
    console.log(`   ID: ${q.id}`);
    console.log(`   Topics: ${q.topics.join(', ')}`);
    console.log(`   Tags: ${q.tags.join(', ')}`);
    
    q.answers.forEach((answer) => {
      const isCorrect = q.correctAnswerIds.includes(answer.id);
      const marker = isCorrect ? '✓' : ' ';
      console.log(`   [${marker}] ${answer.text}`);
    });
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Question bank loaded successfully!');
  
} catch (error) {
  console.error('❌ Error loading question bank:', error);
  process.exit(1);
}
