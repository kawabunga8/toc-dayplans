-- Seed learning standards + rubrics from PDFs
begin;

-- ADST / UNDERSTANDING CONTEXT
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$ADST$s$, $k$understanding_context$k$, $t$UNDERSTANDING CONTEXT$t$, $p$Learning Standards/FINAL ADST 9-12 Rubrics-2.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$Begins to explore research and empathetic
observation to begin to understand needs and
uncover design opportunities, guided by curiosity
and compassion.
States design skills, tools, and technologies needed
based on social, ethical, and/or sustainability
considerations to serve individuals, communities,
and/or the environment.
Explores research and empathetic observation to
understand needs and uncover meaningful design
opportunities, guided by curiosity and compassion.
Identifies design skills, tools, and technologies$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$Somewhat explores research and empathetic
observation to understand some needs and uncover und
adequately meaningful design opportunities,
guided by curiosity and compassion.
Identifies design skills, tools, and technologies
needed based on social, ethical, and/or
sustainability considerations to serve individuals,
communities, and/or the environment.
 Explores and describes research and empathetic
 observation to understand needs and uncover
 meaningful design opportunities, guided by
 curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$Explores research and empathetic observation to
erstand needs and uncover meaningful design
opportunities, guided by curiosity and compassion.
Outlines design skills, tools, and technologies
needed based on social, ethical, and/or
sustainability considerations to serve individuals,
communities, and/or the environment.
   Explores and explains research and empathetic
   observation to understand needs and uncover
   meaningful design opportunities, guided by
   curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$Explores and describes research and empathetic
observation to understand needs and uncover
exceptionally meaningful design opportunities,
guided by curiosity and compassion.
Describes design skills, tools, and technologies
needed based on social, ethical, and/or
sustainability considerations to serve individuals,
communities, and/or the environment.
Explores and justifies research and empathetic
observation to understand needs and uncover
exceptionally meaningful design opportunities,
guided by curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$needed based on social, ethical, and/or
sustainability considerations to serve individuals,
communities, and/or the environment.
Explores and describes research and empathetic
observation to understand needs and uncover
meaningful design opportunities, guided by
curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$Outlines design skills, tools, and technologies
 needed based on social, ethical, and/or
 sustainability considerations to serve individuals,
 communities, and/or the environment.
 Explores and explains research and empathetic
 observation to understand needs and uncover
 meaningful design opportunities, guided by
 curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$Describes design skills, tools, and technologies
   needed based on social, ethical, and/or
   sustainability considerations to serve individuals,
   communities, and/or the environment.
   Explores and justifies research and empathetic
   observation to understand needs and uncover
   meaningful design opportunities, guided by
   curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$Explains design skills, tools, and technologies
needed based on social, ethical, and/or
sustainability considerations to serve individuals,
communities, and/or the environment.
Explores and justifies research and empathetic
observation to understand needs and uncover
exceptionally meaningful design opportunities,
guided by curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$Outlines design skills, tools, and technologies
needed based on social, ethical, and/or
sustainability considerations to serve individuals,
communities, and/or the environment.
Explores and explains research and empathetic
observation to understand needs and uncover
meaningful design opportunities, guided by
curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$Describes design skills, tools, and technologies
 needed based on social, ethical, and/or
 sustainability considerations to serve individuals,
 communities, and/or the environment.
 Explores and justifies research and empathetic
 observation to understand needs and uncover
 meaningful design opportunities, guided by
 curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$Explains design skills, tools, and technologies
   needed based on social, ethical, and/or
   sustainability considerations to serve individuals,
   communities, and/or the environment.
   Synthesizes and justifies research and empathetic
   observation to understand needs and uncover
   meaningful design opportunities, guided by
   curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$Justifies design skills, tools, and technologies
needed based on social, ethical, and/or
sustainability considerations to serve individuals,
communities, and/or the environment.
Synthesizes and justifies research and empathetic
observation to understand needs and uncover
exceptionally meaningful design opportunities,
guided by curiosity and compassion.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$Describes design skills, tools, and technologies
needed based on social, ethical, and/or
sustainability considerations to serve individuals,
communities, and/or the environment.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$Explains design skills, tools, and technologies
 needed based on social, ethical, and/or
 sustainability considerations to serve individuals,
 communities, and/or the environment.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$Justifies design skills, tools, and technologies
   needed based on social, ethical, and/or
   sustainability considerations to serve individuals,
   communities, and/or the environment.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$Justifies, and evaluates decisions of, design skills,
tools, and technologies needed based on social,
ethical, and/or sustainability considerations to serve
individuals, communities, and/or the environment.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$understanding_context$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- ADST / DEFINE AND IDEATE
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$ADST$s$, $k$define_and_ideate$k$, $t$DEFINE AND IDEATE$t$, $p$Learning Standards/FINAL ADST 9-12 Rubrics-2.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$Presents one design ideas by gathering inspiration,
taking creative risks, and considering multiple
viable ideas criteria and constraints.
States design idea based on intended service
impact (for individuals, communities and/or the
environment) and begins to recognize contextual
factors (social, ethical, and/or sustainability) to
serve individuals, communities, and the
environment while remaining open to iteration.
Presents a few feasible design ideas by gathering
inspiration and taking creative risks.
Identifies design idea based on intended service
impact (for individuals, communities and/or the
environment) and begins to recognize contextual$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$Presents a few feasible design ideas by gathering inspiration
and taking creative risks.
Identifies design idea based on intended service impact (for
individuals, communities and/or the environment) and
recognizes some contextual factors (social, ethical, and/or
sustainability) to serve individuals, communities, and the
environment while remaining open to iteration.
Develops a feasible design idea by gathering inspiration,
taking creative risks, and considering constraints.
Outlines design idea based on intended service impact (for
individuals, communities and/or the environment) and
recognizes some contextual factors (social, ethical, and/or$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$Presents a range of feasible design ideas by gathering
inspiration, taking creative risks, and considering
constraints.
Outlines design idea based on intended service impact
(for individuals, communities and/or the environment)
and recognizes several contextual factors (social,
ethical, and/or sustainability) to serve individuals,
communities, and the environment while remaining open
to iteration.
Develops a range of feasible design ideas by gathering
inspiration, taking creative risks, and considering viable
ideas criteria and constraints.
Describes design idea based on intended service impact
(for individuals, communities and/or the environment)$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$Presents a wide range of feasible design ideas by
gathering inspiration, taking creative risks, and considering
viable ideas criteria and constraints.
Describes design idea based on intended service impact
(for individuals, communities and/or the environment) and
recognizes a range of contextual factors (social, ethical,
and/or sustainability) to serve individuals, communities,
and the environment while remaining open to iteration.
Develops a wide range of feasible design ideas by
gathering inspiration, taking creative risks, and considering
multiple viable ideas criteria and constraints.
Explains design idea based on intended service impact
(for individuals, communities and/or the environment) and$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$factors (social, ethical, and/or sustainability) to
serve individuals, communities, and the
environment while remaining open to iteration.
Develops few feasible design ideas by gathering
inspiration, taking creative risks, and considering
constraints.
Outlines design idea based on intended service$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$sustainability) to serve individuals, communities, and the
environment while remaining open to iteration.
Develops some feasible design ideas by gathering
inspiration, taking creative risks, and considering viable ideas
criteria and constraints.
Describes design idea based on intended service impact (for$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$and recognizes a range of contextual factors (social,
ethical, and/or sustainability) to serve individuals,
communities, and the environment while remaining open
to iteration.
Develops a range of feasible design ideas by gathering
inspiration, taking creative risks, and examining viable
ideas criteria and constraints, describing limitations
Explains design idea based on intended service impact$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$recognizes a range of contextual factors (social, ethical,
and/or sustainability) to serve individuals, communities,
and the environment while remaining open to iteration.
Develops a wide range of feasible design ideas by
gathering inspiration, taking creative risks, and examining
viable ideas criteria and constraints, explaining limitations
Justifies design idea based on intended service impact (for$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$impact (for individuals, communities and/or the
environment) and recognizes some contextual
factors (social, ethical, and/or sustainability) to
serve individuals, communities, and the
environment while remaining open to iteration.
Develops feasible design ideas by gathering$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$individuals, communities and/or the environment) and
recognizes a range of contextual factors (social, ethical,
and/or sustainability) to serve individuals, communities, and
the environment while remaining open to iteration.
Develops a range of feasible design ideas by gathering$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$(for individuals, communities and/or the environment)
and recognizes a range of contextual factors (social,
ethical, and/or sustainability) to serve individuals,
communities, and the environment while remaining open
to iteration.
Develops a wide range of feasible design ideas by$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$individuals, communities and/or the environment) and
recognizes a range of contextual factors (social, ethical,
and/or sustainability) to serve individuals, communities,
and the environment while remaining open to iteration.
Develops a wide range of feasible design ideas by$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$inspiration, taking creative risks, and summarizing
viable ideas criteria and constraints, describing
limitations
Describes design idea based on intended service
impact (for individuals, communities and/or the
environment) and recognizes a range of contextual
factors (social, ethical, and/or sustainability) to
serve individuals, communities, and the
environment while remaining open to iteration.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$inspiration, taking creative risks, and examining viable ideas
criteria and constraints, describing limitations
                                                                exa
Explains design idea based on intended service impact (for      exp
individuals, communities and/or the environment) and
recognizes a range of contextual factors (social, ethical,      Jus
and/or sustainability) to serve individuals, communities, and   (fo
the environment while remaining open to iteration.              and
                                                                eth
                                                                com
                                                                to$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$gathering inspiration, taking creative risks, and
mining viable ideas criteria and constraints,         viable
laining limitations                                   justify
tifies design idea based on intended service impact   Excepti
r individuals, communities and/or the environment)    service
 recognizes a range of contextual factors (social,    environ
ical, and/or sustainability) to serve individuals,    factors
munities, and the environment while remaining open    individ
iteration.                                            remaini$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$gathering inspiration, taking creative risks, and examining
ideas criteria and constraints, explaining and
ing limitations
onally justifies design idea based on intended
 impact (for individuals, communities and/or the
ment) and recognizes a wide range of contextual
 (social, ethical, and/or sustainability) to serve
uals, communities, and the environment while
ng open to iteration.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$define_and_ideate$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- ADST / PROTOTYPE AND TEST
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$ADST$s$, $k$prototype_and_test$k$, $t$PROTOTYPE AND TEST$t$, $p$Learning Standards/FINAL ADST 9-12 Rubrics-2.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$Begins to construct a development and
production plan, stating a prototyping method, p
tool adaptations, materials, and procedures ,as
needed
Begins to use learning from tests, feedback,
data to refine or abandon designs, maintaining t
a commitment to growth.
Begin to construct a development and
production plan, identifying a prototyping
method, tool adaptations, materials, and
procedures, as needed$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$Somewhat constructs a development and production
lan, identifying a prototyping method, tool
adaptations, materials, and procedures, as needed
Adequately uses learning from tests, feedback, data to
refine or abandon designs, maintaining a commitment
o growth.
      Somewhat constructs a development and production
      plan, outlining a prototyping method, tool adaptations,
      materials, and procedures, as needed$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$Constructs a development and production plan,
outlining a prototyping method, tool adaptations,
materials, and procedures, as needed
Applies learning from tests, feedback, data to refine
or abandon designs, maintaining a commitment to
growth.
Constructs a development and production plan,
describing a prototyping method, tool adaptations,
materials, and procedures, as needed$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$Thoroughly constructs a development and
production plan, describing a prototyping method,
tool adaptations, materials, and procedures, as
needed
Analyzes learning from tests, feedback, data to refine
or abandon designs, maintaining a commitment to
growth.
Thoroughly constructs a development and
production plan, explaining a prototyping method,
tool adaptations, materials, and procedures, as
needed$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$Begins to apply learning from tests, feedback,
data to refine or abandon designs, maintaining
a commitment to growth.
Begins to construct a development and
production plan, outlining a prototyping
method, tool adaptations, materials, and$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$Adequately applies learning from tests, feedback, data
      to refine or abandon designs, maintaining a
      commitment to growth.
      Somewhat constructs a development and production
      plan, describing a prototyping method, tool
      adaptations, materials, and procedures, as needed$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$Synthesizes learning from tests, feedback, data to
refine or abandon designs, maintaining a
commitment to growth.
Constructs a development and production plan,
explaining a prototyping method, tool adaptations,
materials, and procedures, as needed$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$Thoroughly synthesizes learning from tests,
feedback, data to refine or abandon designs,
maintaining a commitment to growth.
Thoroughly constructs a development and
production plan, justifying a prototyping method, tool
adaptations, materials, and procedures, as needed$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$procedures, as needed
Begins to synthesize learning from tests,
feedback, data to refine or abandon designs,
maintaining a commitment to growth.
Begins to construct a development and
production plan, describing a prototyping
method, tool adaptations, materials, and
procedures, as needed$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$Somewhat synthesizes learning from tests, feedback,
      data to refine or abandon designs, maintaining a
      commitment to growth.
 Somewhat constructs a development and production        Constructs a
 plan, explaining a prototyping method, tool             justifying a
 adaptations, materials, and procedures, as needed       materials, an$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$Evaluates learning from tests, feedback, data to
refine or abandon designs, maintaining a
commitment to growth.
development and production plan,         Constructs a rob
prototyping method, tool adaptations,    plan, justifying
d procedures, as needed                  adaptations, mat$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$Thoroughly evaluates learning from tests, feedback,
data to refine or abandon designs, maintaining a
commitment to growth.
ust development and production
 a prototyping method, tool
erials, and procedures, as needed$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$Begins to evaluate learning from tests,
feedback, data to refine or abandon designs,
maintaining a commitment to growth.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$Somewhat evaluates learning from tests, feedback,       Evaluates, wi
 data to refine or abandon designs, maintaining a        feedback, dat
 commitment to growth.                                   maintaining a$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$th explanation, learning from tests,     Critically evalu
a to refine or abandon designs,          tests, feedback,
 commitment to growth.                   maintaining a co$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$ates, with justification learning from
 data to refine or abandon designs,
mmitment to growth.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$prototype_and_test$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- ADST / MAKE
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$ADST$s$, $k$make$k$, $t$MAKE$t$, $p$Learning Standards/FINAL ADST 9-12 Rubrics-2.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$Follows a plan with frequent support; may
need reminders to describe changes.
Selects tools or materials with guidance.
Technical skills are in the early stages.
Follows a plan with guidance, describing
basic changes.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$Follows a plan with some help, sometimes
describing simple changes.
Selects common tools and materials with some
support. Technical skills show growth and
developing abilities.
Follows a plan with some independence,
occasionally describing and justifying changes.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$Follows a plan with limited support, describing
and making purposeful changes.
Selects appropriate tools and materials for tasks.
Demonstrates competent technical skills.
Follows and adapts a plan independently, clearly In
describing changes.                              ju$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$Follows and adapts a plan independently,
clearly explaining decisions and changes.
Confidently selects and uses tools and
materials effectively. Shows strong technical
skills.
dependently adapts and refines a plan,
stifying changes with insight.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$Needs confirmation when selecting tools or
materials. Developing technical skills with
support.
Follows a plan with support, describing$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$Begins selecting tools and materials with limited
input. Technical skills are improving.
Follows a plan with some independence,$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$Selects appropriate tools and materials with
growing confidence. Demonstrates sound
technical skills.
Follows and adapts a plan with increasing$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$Selects and applies tools and materials
confidently and appropriately. Technical skills
are precise and effective.
Independently creates, follows, and adapts a$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$changes made.
Requires confirmation that the correct
tools, technologies and/or materials are
selected for appropriate tasks, resulting in
emerging technical skills.
Follows a plan with support, explaining
changes made
Requires confirmation that the best$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$occasionally describing and justifying changes
 made.
 Demonstrates some confidence in selecting
 appropriate tools, technologies, and/or materials,
 resulting in developing technical skills.
 Follows a plan with some independence,
 occasionally describing and justifying changes
 made.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$independence, clearly describing and justifying
  changes made.
  Effectively and independently demonstrates
  confidence in selecting suitable tools,
  technologies, and materials for tasks, resulting
  consistent technical skills.
  Follows and adapts a plan with increasing
  independence, clearly describing and justifying
  changes made.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$detailed plan, thoughtfully explaining and
     evaluating changes.
     Leads and/or enhances demonstration
     efforts, thoughtfully selecting and applying
in   tools, technologies, and materials to tasks,
     resulting in refined technical skills.
     Independently creates, follows, and adapts a
     detailed plan, thoughtfully explaining,
     justifying and evaluating changes.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$available tools, technologies and/or
materials are selected for appropriate tasks,
resulting in emerging technical skills$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$Demonstrates some confidence in selecting
 appropriate tools, technologies, and/or materials,
 resulting in developing technical skills.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$Effectively and independently demonstrates
  confidence in selecting suitable tools,
  technologies, and materials for tasks, resulting
  competent and consistent technical skills.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$Leads and/or enhances collaborative efforts,
     expertly selecting and applying tools,
in   technologies, and materials to tasks, resulting
     in refined and advanced technical skills.$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$make$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- ADST / SHARE
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$ADST$s$, $k$share$k$, $t$SHARE$t$, $p$Learning Standards/FINAL ADST 9-12 Rubrics-2.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$States how the product served individuals,
communities, and/or the environment
Present product with rationale for the
selected solution, stating modifications and
procedures, and using basic terminology for
an intended audience
dentifies how the product served              Ou
ndividuals, communities, and/or the           co
nvironment
                                           Prese
resent product with rationale for the      solut$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$Identifies how the product served individuals,
communities, and/or the environment
Present product with rationale for the selected
solution, identifying modifications and
procedures, and using some accurate terminology
for an intended audience
tlines how the product served individuals,       Desc
mmunities, and/or the environment                comm
nt product with rationale for the selected       Pres
ion, outlining modifications and procedures,     solu$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$Outlines how the product served individuals,
communities, and/or the environment
Present product with rationale for the selected
solution, outlining modifications and procedures,
and using accurate terminology for an intended
audience
ribes how the product served individuals,      Explain
unities, and/or the environment                communi
ent product with rationale for the selected    Present
tion, describing modifications and             solutio$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$Describes how the product served individuals,
communities, and/or the environment
Present product with rationale for the selected
solution, describing modifications and
procedures, and using a range of excellent
terminology for an intended audience
s how the product served individuals,
ties, and/or the environment
 product with rationale for the selected
n, explaining modifications and$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$elected solution, outlining modifications  and u
nd procedures, and using basic terminology inten
or an intended audience
utlines how the product served individuals,   De
ommunities, and/or the environment            co
resent product with rationale for the         Pr
elected solution, outlining modifications     so$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$sing some accurate terminology for an            proc
ded audience                                     an i
scribes how the product served individuals,      Expl
mmunities, and/or the environment                indi
esent product with rationale for the selected    Pres
lution, describing modifications and             solu$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$edures, and using terminology accurately for   procedu
ntended audience                               termino
ains and evaluates how the product served      Justifi
viduals, communities, and/or the environment   served
                                               environ
ent product with rationale for the selected
tion, explaining modifications and             Present$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$res, and using a range of excellent
logy for an intended audience
es and evaluates how the product
individuals, communities, and/or the
ment
 product with rationale for the selected$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$nd procedures, and using basic terminology    pr
or an intended audience                       an
escribes how the product served               De
ndividuals, communities, and/or the           in
nvironment
                                           Prese
resent product with rationale for the      solut$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$ocedures, and using terminology accurately for   proc
 intended audience                               an i
scribes and evaluates how the product served     Just
dividuals, communities, and/or the environment   indi
nt product with rationale for the selected       Pres
ion, explaining modifications and                solu$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$edures, and using terminology accurately for   solutio
ntended audience                               modific
                                               range o
                                               audienc
ifies and evaluates how the product served     Thoroug
viduals, communities, and/or the environment   product
                                               and/or
ent product with rationale for the selected
tion, explaining and evaluating                Present$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$n, explaining and evaluating
ations and procedures, and using a
f excellent terminology for an intended
e
hly justifies and evaluates how the
 served individuals, communities,
the environment
 product with rationale for the selected$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$elected solution, describing modifications proce
nd procedures, and using basic terminology an in
or an intended audience$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$dures, and using terminology accurately for      modi
tended audience                                  term$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$fications and procedures, and using            solutio
inology accurately for an intended audience    modific
                                               range o
                                               audienc$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$n, justifying and evaluating
ations and procedures, and using a
f excellent terminology for an intended
e$txt$, now()
from public.learning_standards ls
where ls.subject = $s$ADST$s$ and ls.standard_key = $k$share$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- FA / ENGAGES AND EXPLORES
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$FA$s$, $k$engages_and_explores$k$, $t$ENGAGES AND EXPLORES$t$, $p$Learning Standards/FINAL Fine Arts 9-12 Rubrics-2.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$• Begins to demonstrate engagement in artistic
  exploration, taking minimal creative risks
• Begins to demonstrate engagement in artistic
  exploration, often relying on safe, familiar choices$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$• Somewhat demonstrates engagement in artistic
  exploration, experimenting with familiar ideas and some
  creative risks
• Demonstrates adequate engagement in artistic
  exploration, experimenting with new ideas with some$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$• Demonstrates engagement in artist exploration,
  experimenting with a range of ideas that show creative
  risks
• Demonstrates substantial engagement in artistic
  exploration, experimenting with a range of new ideas$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$• Fully demonstrates engagement in artistic
  exploration, independently experimenting with a wide
  range of ideas that thoroughly show creative risks
• Demonstrates excellent engagement in artistic
  exploration, experimenting with a wide range of new$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$resulting in limited creative risks
• Demonstrates limited engagement in artistic
  exploration, with minimal investment resulting in$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$independence that show some creative risks
• Demonstrates adequate engagement in artistic
  exploration, experimenting with new ideas with some$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$independently that show substantial creative risks
• Demonstrates substantial engagement in artistic
  exploration, experimenting with a range of new ideas$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$ideas independently and purposefully that
  thoroughly show creative risks
• Demonstrates thorough and excellent engagement
  in artistic exploration, experimenting with a wide$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$few creative risks
• Demonstrates and applies limited engagement
  in artistic exploration, with limited initiative$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$creative initiative that show some creative risks
• Demonstrates and applies adequate engagement in
  artistic exploration, experimenting with new ideas with$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$confidently and independently that show substantial
  creative risks
• Demonstrates and applies substantial engagement in
  artistic exploration, experimenting with a range of new$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$range of new ideas independently and purposefully
  that thoroughly show creative risks
• Demonstrates thorough and excellent engagement
  in artistic exploration, experimenting with a wide$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$resulting in few creative risks$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$some creative initiative that show some creative risks$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$ideas confidently and independently and with a clear
  purpose that show substantial creative risks$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$range of new ideas independently and purposefully
  that effectively achieve a clear intention that
  thoroughly show creative risks to expand ideas$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$engages_and_explores$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- FA / APPLYING SKILLS AND TECHNIQUES
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$FA$s$, $k$applying_skills_and_techniques$k$, $t$APPLYING SKILLS AND TECHNIQUES$t$, $p$Learning Standards/FINAL Fine Arts 9-12 Rubrics-2.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$• Demonstrates limited control of familiar tools or
  materials
• Uses basic techniques and/or vocabulary with
  limited accuracy
• Demonstrates basic technical skills with
  inconsistent control of tools and materials
• Uses limited artistic vocabulary, techniques$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$• Demonstrates some control using familiar tools and
  materials
• Uses common techniques and/or vocabulary with some
  accuracy
• Demonstrates some technical skills with adequate
  control and accuracy with tools and materials
• Uses some artistic vocabulary, techniques and/or$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$• Demonstrates consistent technical skill and control of
  tools and materials
• Uses appropriate techniques and/or vocabulary with
   accuracy
• Demonstrates consistent technical skill and abilities
   with substantial control of tools and materials
• Uses and applies a range of substantial artistic$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$• Demonstrates refined and confident technical skill
   and control of tools and materials
• Uses and applies a range of appropriate techniques
   and/or vocabulary with precision
• Demonstrates advanced technical skill and ability
  with confident control of tools and materials,
  establishing creativity and precision throughout$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$and/or methods with support
• Begins to demonstrate use of technical skills
  often showing hesitancy in control of tools and
  materials$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$methods with some confidence
• Adequately demonstrates use of technical skills often
  showing some confidence in control of tools and
  materials$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$vocabulary, techniques and/or methods with
   independence
• Consistently demonstrates use of technical skills often
   showing substantial confidence in control of tools and
   materials$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$• Uses and applies wide range of excellent artistic
   vocabulary, techniques and/or methods with
   independence
• Confidently and excellently demonstrates use of
   technical skills often showing thorough confidence
   in control of tools and materials$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$• Uses and applies limited artistic vocabulary,
   techniques and/or methods with support
• Demonstrates minimal technical control and
  shows inconsistent confidence with tools and
  materials
• Uses and applies limited artistic vocabulary,$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$• Uses and applies a range of adequate artistic
  vocabulary, techniques and/or methods with some
  independence
• Adequately demonstrates use of technical skills;
  control of tools and materials shows some confidence
  and consistency
• Uses and applies a range of adequate artistic$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$• Uses and applies a range of substantial artistic
   vocabulary, techniques and/or methods with
   independence, describing their importance to the
   context
• Regularly demonstrates effective use of technical
  skills; control of tools and materials shows substantial
  confidence and consistency across contexts
• Uses and applies a range of substantial artistic$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$• Uses and applies wide range of excellent artistic
   vocabulary, techniques and/or methods with
   independence, thoroughly describing their
   importance to the context
• Masterfully demonstrates highly effective use of
  technical skills; control of tools and materials shows
  excellent confidence and consistency across a range
  of contexts$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$techniques and/or methods$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$vocabulary, techniques and/or methods with some
  independence, describing their importance to the
  context$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$vocabulary, techniques and/or methods with
   independence, explaining their importance to the
   context$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$• Uses and applies a range of substantial artistic
   vocabulary, techniques and/or methods with
   independence, thoroughly explaining their
   importance to the context$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$applying_skills_and_techniques$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- FA / CREATING
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$FA$s$, $k$creating$k$, $t$CREATING$t$, $p$Learning Standards/FINAL Fine Arts 9-12 Rubrics-2.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$• Begins to create, identifying ideas with minimal
  creative intent
• Applies feedback with minimal revision(s) or
  reflection(s) to refine artistic work
• Begins to create, outlining ideas with occasional
  creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$• Adequately creates, identifying ideas with some
  creative intent
• Applies feedback with some revisions or reflections to
  refine artistic work
• Adequately creates, outlining ideas with some creative
  intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$• Substantially creates, outlining ideas with creative
  intent
• Applies feedback to present substantial revisions or
  reflections to refine artistic work
• Substantially creates, developing ideas with
  substantial creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$• Excellently creates, outlining ideas with purposeful and
  consistent creative intent
• Applies feedback to present thorough and purposeful
  revisions or reflections to refine artistic work
• Excellently creates, developing ideas with purposeful
  and consistent creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$• Applies feedback with minimal revision(s) or
  reflection(s) to refine artistic work
• Begins to create, developing ideas with minimal
  creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$• Applies feedback with some revisions or reflections to
  refine artistic work
• Adequately creates, developing ideas with some
  creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$• Applies feedback to present substantial revisions or
  reflections to refine artistic work
• Substantially creates, developing and applying
  ideas with substantial creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$• Applies feedback to present thorough and purposeful
  revisions or reflections to refine artistic work
• Excellently creates, developing and applying ideas with
  purposeful and consistent creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$• Applies feedback with minimal revision(s) or
  reflection(s) to refine artistic work
• Begins to create, developing and applying ideas
  with minimal creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$• Applies feedback with some revisions or reflections to
  refine artistic work
• Adequately creates, developing and applying ideas
  with some creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$• Applies feedback to present substantial revisions or
  reflections to refine artistic work
• Consistently creates, developing and applying
  ideas with substantial creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$• Applies feedback to present thorough and purposeful
  revisions or reflections to refine artistic work
• Excellently creates, developing and applying ideas with
  purposeful and consistent creative intent$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$• Applies feedback with minimal revision(s) or
  reflection(s) to refine artistic work$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$• Applies feedback with some revisions or reflections to
  refine artistic work$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$• Applies feedback to present substantial revisions or
  reflections to refine artistic work$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$• Applies feedback to present thorough and purposeful
  revisions or reflections to refine artistic work$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$creating$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- FA / ANALYZING
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$FA$s$, $k$analyzing$k$, $t$ANALYZING$t$, $p$Learning Standards/FINAL Fine Arts 9-12 Rubrics-2.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$• Describes artistic works of others with limited
  observation, outlining how technique and
  message interact
• Presents a limited commentary of certain
  elements or principles of their artwork
• Describes artistic works of others with limited
   observation, outlining how technique and$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$• Describes artistic works of others with some
  observation, outlining how technique and message
  interact
• Presents an adequate commentary of certain elements
  or principles of their artwork
• Describes artistic works of others with some
  observation, interpreting how technique and message$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$• Describes artistic works of others with substantial
  observation, interpreting how technique and message
  interact
• Presents a substantial commentary of certain
  elements or principles of their artwork
• Explains artistic works of others with substantial
  observation, analyzing how technique and message$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$• Explain artistic works of others with excellent
  observation, analyzing how technique and message
  interact
• Presents an excellent commentary of certain
  elements or principles of their artwork
• Explains artistic works of others with excellent
   observation, analyzing how technique and message$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$message relate
• Presents a limited evaluation of certain elements
   and principles of their artwork
• Explains artistic works of others with limited
   observation, interpreting how technique and$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$relate
• Presents an adequate evaluation of certain elements
   and principles of their artwork
• Explains artistic works of others with some observation,
  analyzing how technique and message develop meaning$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$relate
• Presents a substantial evaluation of certain elements
   and principles of their artwork
• Evaluates artistic works of others with substantial
   observation, analyzing how technique and message$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$relate
• Presents an excellent evaluation of certain
   elements and principles of their artwork
• Evaluates artistic works of others with excellent
   observation, analyzing how technique and message$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$message develop meaning
• Presents a limited evaluation of their artwork
• Begins to evaluate artistic works of others with
   limited observation, analyzing how technique and$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$• Presents an adequate evaluation of their artwork
• Somewhat evaluates artistic works of others with some
   observation, analyzing how technique and message$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$develop meaning
• Presents a substantial evaluation of their artwork
• Evaluates artistic works of others with substantial
   observation, analyzing and justifying how technique$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$develop meaning
• Presents an excellent evaluation of their artwork
• Evaluates artistic works of others with excellent
   observation, analyzing and justifying how technique$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$message develop meaning
• Presents a limited critique of their artwork$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$develop meaning
• Presents an adequate critique of their artwork$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$and message develop meaning
• Presents a substantial critique of their artwork$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$and message develop meaning
• Presents an excellent critique of their artwork$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$analyzing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- FA / PRESENTING AND SHARING
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$FA$s$, $k$presenting_and_sharing$k$, $t$PRESENTING AND SHARING$t$, $p$Learning Standards/FINAL Fine Arts 9-12 Rubrics-2.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$• Creates, presents, and shares artistic work
  (display, portfolio, exhibition or performance) in a
  limited way, demonstrating minimal
  consideration of context
• Creates, presents, and shares artistic work
   (display, portfolio, exhibition or performance) in a$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) adequately,
  demonstrating some consideration of context
• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) adequately,$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) substantially,
  demonstrating appropriate connection to the context
• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) substantially,$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) excellently,
  demonstrating excellent connection to the context
• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) excellently,$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$limited way, beginning to demonstrate
   connection to the context
• Creates, presents, and shares artistic work
   (display, portfolio, exhibition or performance) in a$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$somewhat demonstrating connection to the context
• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) adequately,$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$demonstrating connection to the context and
  attentiveness to most relevant details
• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) substantially,$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$completely demonstrating connection to the context
  and attentiveness to all relevant details
• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) excellently,$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$limited way, beginning to demonstrate
   connection to the context and attentiveness to
   details
• Creates, presents, and shares artistic work
   (display, portfolio, exhibition or performance) in a
   limited way, beginning to demonstrate$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$somewhat demonstrating connection to the context and
  attentiveness to details
• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) adequately,
  somewhat demonstrating connection to the context,$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$demonstrating connection to the context, attentiveness
  to most relevant details, and effective consideration of
  audience
• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) substantially,
  demonstrating connection to the context, attentiveness$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$completely demonstrating connection to the
  context, attentiveness to all relevant details, and
  completely effective consideration of audience
• Creates, presents, and shares artistic work (display,
  portfolio, exhibition or performance) excellently,
  completely demonstrating connection to the$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$connection to the context, attentiveness to details,
   and consideration of audience$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$attentiveness to details, and consideration of audience$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$to details, and consideration of audience with a clear
  and deliberate creative intention$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$context, attentiveness to details, and consideration of
  audience with a thoroughly clear and deliberate
  creative intention$txt$, now()
from public.learning_standards ls
where ls.subject = $s$FA$s$ and ls.standard_key = $k$presenting_and_sharing$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- Bible / KNOW GOD
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$Bible$s$, $k$know_god$k$, $t$KNOW GOD$t$, $p$Learning Standards/FINAL Bible 9-12 Rubrics - Done.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();

-- Bible / KNOW SELF
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$Bible$s$, $k$know_self$k$, $t$KNOW SELF$t$, $p$Learning Standards/FINAL Bible 9-12 Rubrics - Done.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$Begin to show personal identity through self-
reflection, Biblical truth, and practicing
discernment
Begin to show confidence and purpose
through personal strengths and God-given
gifts
Begin to apply personal identity through self-
reflection, Biblical truth, and practicing
discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$Partially show personal identity through self-
reflection, Biblical truth, and practicing
discernment
Partially show confidence and purpose through
personal strengths and God-given gifts
Partially apply personal identity through self-
reflection, Biblical truth, and practicing
discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$Show personal identity through self-reflection,
Biblical truth, and practicing discernment
Show confidence and purpose through personal
strengths and God-given gifts
Apply personal identity through self-reflection,
Biblical truth, and practicing discernment
Apply confidence and purpose through personal$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$Fully show personal identity through self-
reflection, Biblical truth, and practicing
discernment
Fully show confidence and purpose through
personal strengths and God-given gifts
Fully apply personal identity through self-
reflection, Biblical truth, and practicing
discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$Begin to apply confidence and purpose
through personal strengths and God-given
gifts
Begin to demonstrate personal identity
through self-reflection, Biblical truth, and
practicing discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$Partially apply confidence and purpose through
personal strengths and God-given gifts
Partially demonstrate personal identity through
self-reflection, Biblical truth, and practicing
discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$strengths and God-given gifts
Demonstrate personal identity through self-
reflection, Biblical truth, and practicing
discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$Fully apply confidence and purpose through
personal strengths and God-given gifts
Fully demonstrate personal identity through
self-reflection, Biblical truth, and practicing
discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$Begin to demonstrate confidence and         Partia
purpose through personal strengths and God- throug
given gifts
Begin to exemplify personal identity through
self-reflection, Biblical truth, and practicing
discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$lly demonstrate confidence and purpose
h personal strengths and God-given gifts
Partially exemplify personal identity through self-
reflection, Biblical truth, and practicing
discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$Demonstrate confidence and purpose through
personal strengths and God-given gifts
Exemplify personal identity through self-
reflection, Biblical truth, and practicing
discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$Fully demonstrate confidence and purpose
through personal strengths and God-given gifts
Fully exemplify personal identity through self-
reflection, Biblical truth, and practicing
discernment$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$Begin to exemplify confidence and purpose
through personal strengths and God-given
gifts$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$Partially exemplify confidence and purpose
through personal strengths and God-given gifts$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$Exemplify confidence and purpose through
personal strengths and God-given gifts$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$Fully exemplify confidence and purpose
through personal strengths and God-given gifts$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$know_self$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- Bible / LOVE GOD
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$Bible$s$, $k$love_god$k$, $t$LOVE GOD$t$, $p$Learning Standards/FINAL Bible 9-12 Rubrics - Done.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$Begin to show their relationship with God
through prayer, worship, and Scripture
Begin to show God’s love in daily life through
service and compassion
Begin to apply their relationship with God
through prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$Partially show their relationship with God through
prayer, worship, and Scripture
Partially show God’s love in daily life through
service and compassion
Partially apply their relationship with God through
prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$Show their relationship with God through prayer,
worship, and Scripture
Show God’s love in daily life through service and
compassion
Apply their relationship with God through prayer,
worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$Fully show their relationship with God through
prayer, worship, and Scripture
Fully show God’s love in daily life through
service and compassion
Fully apply their relationship with God through
prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$Begin to apply God’s love in daily life through
service and compassion
Begin to demonstrate their relationship with
God through prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$Partially apply God’s love in daily life through
service and compassion
Partially demonstrate their relationship with God
through prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$Apply God’s love in daily life through service and
compassion
Demonstrate their relationship with God through
prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$Fully apply God’s love in daily life through
service and compassion
Fully demonstrate their relationship with God
through prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$Begin to demonstrate God’s love in daily life
through service and compassion
Begin to exemplify their relationship with
God through prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$Partially demonstrate God’s love in daily life
through service and compassion
Partially exemplify their relationship with God
through prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$Demonstrate God’s love in daily life through
service and compassion
Exemplify their relationship with God through
prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$Fully demonstrate God’s love in daily life
through service and compassion
Fully exemplify their relationship with God
through prayer, worship, and Scripture$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$Begin to exemplify God’s love in daily life
through service and compassion$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$Partially exemplify God’s love in daily life through
service and compassion$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$Exemplify God’s love in daily life through service
and compassion$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$Fully exemplify God’s love in daily life through
service and compassion$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_god$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- Bible / LOVE OTHERS
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$Bible$s$, $k$love_others$k$, $t$LOVE OTHERS$t$, $p$Learning Standards/FINAL Bible 9-12 Rubrics - Done.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$Begin to show compassion and empathy in
relationships
Begin to show service to others as modeled
by Christ
Begin to apply compassion and empathy in
relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$Partially show compassion and empathy in
relationships
Partially show service to others as modeled by
Christ
Partially apply compassion and empathy in
relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$Show compassion and empathy in relationships
Show service to others as modeled by Christ
Apply compassion and empathy in relationships
Apply service to others as modeled by Christ$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$Fully show compassion and empathy in
relationships
Fully show service to others as modeled by
Christ
Fully apply compassion and empathy in
relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$Begin to apply service to others as modeled
by Christ
Begin to demonstrate compassion and
empathy in relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$Partially apply service to others as modeled by
Christ
Partially demonstrate compassion and empathy
in relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$Demonstrate compassion and empathy in
relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$Fully apply service to others as modeled by
Christ
Fully demonstrate compassion and empathy in
relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$Begin to demonstrate service to others as
modeled by Christ
Begin to exemplify compassion and
empathy in relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$Partially demonstrate service to others as
modeled by Christ
Partially exemplify compassion and empathy in
relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$Demonstrate service to others as modeled by
Christ
Exemplify compassion and empathy in
relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$Fully demonstrate service to others as
modeled by Christ
Fully exemplify compassion and empathy in
relationships$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$Begin to exemplify service to others as
modeled by Christ$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$Partially exemplify service to others as modeled
by Christ$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$Exemplify service to others as modeled by Christ$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$Fully exemplify service to others as modeled
by Christ$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$love_others$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

-- Bible / BE EQUIPPED
insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)
values ($s$Bible$s$, $k$be_equipped$k$, $t$BE EQUIPPED$t$, $p$Learning Standards/FINAL Bible 9-12 Rubrics - Done.pdf$p$, now())
on conflict (subject, standard_key) do update
set standard_title = excluded.standard_title,
    source_pdf_path = excluded.source_pdf_path,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$emerging$lvl$, $txt$Begin to outline what spiritual knowledge,
spiritual practices, and Biblical principles
equip self for purposeful living
Begin to reflect on personal character and
leadership attributes informed by beginning
to show faith-based service and
responsibility to others
Begin to describe what spiritual knowledge,
spiritual practices, and Biblical principles
equip self for purposeful living$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$developing$lvl$, $txt$Somewhat outline what spiritual knowledge,
spiritual practices, and Biblical principles equip
self for purposeful living
Somewhat reflect on personal character and
leadership attributes informed by partially
showing faith-based service and responsibility to
others
Somewhat describe what spiritual knowledge,
spiritual practices, and Biblical principles equip
self for purposeful living$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$proficient$lvl$, $txt$Outline what spiritual knowledge, spiritual
practices, and Biblical principles equip self for
purposeful living
Reflect on personal character and leadership
attributes informed by showing faith-based
service and responsibility to others
Describe what spiritual knowledge, spiritual
practices, and Biblical principles equip self for
purposeful living$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 9, $lvl$extending$lvl$, $txt$Outline what spiritual knowledge, spiritual
practices, and Biblical principles equip self for
purposeful living
Completely reflect on personal character and
leadership attributes informed by fully showing
faith-based service and responsibility to others
Fully describe what spiritual knowledge,
spiritual practices, and Biblical principles equip
self for purposeful living$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$emerging$lvl$, $txt$Begin to reflect on personal character and
leadership attributes informed by beginning
to apply faith-based service and
responsibility to others
Begin to explain what spiritual knowledge,
spiritual practices, and Biblical principles
equip self for purposeful living$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$developing$lvl$, $txt$Somewhat reflect on personal character and
leadership attributes informed by partially
applying faith-based service and responsibility to
others
Somewhat explain what spiritual knowledge,
spiritual practices, and Biblical principles equip
self for purposeful living$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$proficient$lvl$, $txt$Reflect on personal character and leadership
attributes informed by applying faith-based
service and responsibility to others
Explain what spiritual knowledge, spiritual
practices, and Biblical principles equip self for
purposeful living$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 10, $lvl$extending$lvl$, $txt$Completely reflect on personal character and
leadership attributes informed by fully applying
faith-based service and responsibility to others
Fully explain what spiritual knowledge, spiritual
practices, and Biblical principles equip self for
purposeful living$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$emerging$lvl$, $txt$Begin to reflect on personal character and
leadership attributes informed by beginning
to exemplify faith-based service and
responsibility to others
egin to justify what spiritual knowledge,     S
piritual practices, and Biblical principles   s
quip self for purposeful living               s$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$developing$lvl$, $txt$Somewhat reflect on personal character and
leadership attributes informed by partially
exemplifying faith-based service and
responsibility to others
omewhat justify what spiritual knowledge,           J
piritual practices, and Biblical principles equip   p
elf for purposeful living                           p$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$proficient$lvl$, $txt$Reflect on personal character and leadership
attributes informed by exemplifying faith-based
service and responsibility to others
ustify what spiritual knowledge, spiritual         F
ractices, and Biblical principles equip self for   p
urposeful living                                   p$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 11, $lvl$extending$lvl$, $txt$Completely reflect on personal character and
leadership attributes informed by fully
exemplifying faith-based service and
responsibility to others
ully justify what spiritual knowledge, spiritual
ractices, and Biblical principles equip self for
urposeful living$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$emerging$lvl$, $txt$egin to reflect on personal character and     S
eadership attributes informed by beginning    l
o demonstrate faith-based service and         d
esponsibility to others                       r$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$developing$lvl$, $txt$omewhat reflect on personal character and           R
eadership attributes informed by partially          a
emonstrating faith-based service and                s
esponsibility to others$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$proficient$lvl$, $txt$eflect on personal character and leadership        C
ttributes informed by demonstrating faith-based    l
ervice and responsibility to others                d
                                                   r$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();
insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)
select ls.id, 12, $lvl$extending$lvl$, $txt$ompletely reflect on personal character and
eadership attributes informed by fully
emonstrating faith-based service and
esponsibility to others$txt$, now()
from public.learning_standards ls
where ls.subject = $s$Bible$s$ and ls.standard_key = $k$be_equipped$k$
on conflict (learning_standard_id, grade, level) do update
set original_text = excluded.original_text,
    updated_at = now();

commit;
